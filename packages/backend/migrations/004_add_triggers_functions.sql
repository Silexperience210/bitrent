-- BitRent Phase 3: Triggers and Functions for Automation
-- Supabase PostgreSQL
-- Version: 4.0.0
-- Date: 2026-03-15

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Calculate rental duration and validate times
CREATE OR REPLACE FUNCTION validate_rental_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.start_time >= NEW.end_time THEN
    RAISE EXCEPTION 'start_time must be before end_time';
  END IF;
  
  -- Auto-calculate duration in minutes
  NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))::INTEGER / 60;
  
  -- Auto-calculate total sats
  NEW.total_sats = NEW.duration_minutes * NEW.sats_per_minute;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Validate payment status transitions
CREATE OR REPLACE FUNCTION validate_payment_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Payment status can transition: pending -> confirmed/failed/expired
  IF OLD.status IS NOT NULL THEN
    IF OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
      RAISE EXCEPTION 'Confirmed payments cannot change status';
    END IF;
    IF OLD.status = 'failed' AND NEW.status != 'failed' THEN
      RAISE EXCEPTION 'Failed payments cannot change status';
    END IF;
    IF OLD.status = 'expired' AND NEW.status != 'expired' THEN
      RAISE EXCEPTION 'Expired payments cannot change status';
    END IF;
  END IF;
  
  -- Set confirmed_at when status becomes confirmed
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    NEW.confirmed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-approve pending rentals when payment is confirmed
CREATE OR REPLACE FUNCTION auto_activate_rental_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  rental_record rentals%ROWTYPE;
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    -- Get the rental
    SELECT * INTO rental_record FROM rentals WHERE id = NEW.rental_id;
    
    -- Update rental to active and set payment_verified_at
    UPDATE rentals 
    SET 
      status = 'active',
      payment_verified_at = NOW(),
      updated_at = NOW()
    WHERE id = NEW.rental_id
    AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update miner revenue when rental completes
CREATE OR REPLACE FUNCTION update_mineur_revenue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE mineurs
    SET 
      total_revenue_sats = total_revenue_sats + NEW.total_sats,
      updated_at = NOW()
    WHERE id = NEW.mineur_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Clean up expired challenges
CREATE OR REPLACE FUNCTION cleanup_expired_challenges()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM challenges WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Archive old rentals (> 1 year)
CREATE OR REPLACE FUNCTION archive_old_rentals()
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- For now, just mark as archived in metadata
  -- In production, move to archived_rentals table
  UPDATE rentals
  SET 
    metadata = jsonb_set(metadata, '{archived}', 'true'::jsonb),
    updated_at = NOW()
  WHERE 
    status = 'completed'
    AND created_at < NOW() - INTERVAL '1 year'
    AND (metadata->>'archived')::boolean IS NOT TRUE;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Calculate daily analytics
CREATE OR REPLACE FUNCTION calculate_daily_analytics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
DECLARE
  total_rentals_count INTEGER;
  total_revenue BIGINT;
  active_mineurs_count INTEGER;
  avg_duration NUMERIC;
  avg_uptime NUMERIC;
BEGIN
  -- Total rentals on target date
  SELECT COUNT(*) INTO total_rentals_count
  FROM rentals
  WHERE DATE(created_at) = target_date;
  
  -- Total revenue confirmed on target date
  SELECT COALESCE(SUM(r.total_sats), 0) INTO total_revenue
  FROM rentals r
  WHERE DATE(r.created_at) = target_date
  AND r.status = 'completed';
  
  -- Active mineurs on target date
  SELECT COUNT(*) INTO active_mineurs_count
  FROM mineurs
  WHERE DATE(created_at) <= target_date
  AND status IN ('online', 'offline');
  
  -- Average rental duration
  SELECT COALESCE(AVG(duration_minutes), 0) INTO avg_duration
  FROM rentals
  WHERE DATE(created_at) = target_date;
  
  -- Average uptime
  SELECT COALESCE(AVG(uptime_percentage), 0) INTO avg_uptime
  FROM mineurs
  WHERE DATE(updated_at) = target_date;
  
  -- Insert or update analytics
  INSERT INTO analytics_daily 
    (date, total_rentals, total_sats_revenue, active_mineurs, avg_rental_duration, uptime_avg)
  VALUES 
    (target_date, total_rentals_count, total_revenue, active_mineurs_count, avg_duration, avg_uptime)
  ON CONFLICT (date) DO UPDATE SET
    total_rentals = total_rentals_count,
    total_sats_revenue = total_revenue,
    active_mineurs = active_mineurs_count,
    avg_rental_duration = avg_duration,
    uptime_avg = avg_uptime,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Log audit trail for important actions
CREATE OR REPLACE FUNCTION audit_log_action(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_changes JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO audit_logs 
    (user_id, action, resource_type, resource_id, changes, ip_address)
  VALUES
    (p_user_id, p_action, p_resource_type, p_resource_id, p_changes, p_ip_address)
  RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

DROP TRIGGER IF EXISTS users_update_timestamp ON users;
CREATE TRIGGER users_update_timestamp
BEFORE UPDATE ON users FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS mineurs_update_timestamp ON mineurs;
CREATE TRIGGER mineurs_update_timestamp
BEFORE UPDATE ON mineurs FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS rentals_update_timestamp ON rentals;
CREATE TRIGGER rentals_update_timestamp
BEFORE UPDATE ON rentals FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS payments_update_timestamp ON payments;
CREATE TRIGGER payments_update_timestamp
BEFORE UPDATE ON payments FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS analytics_daily_update_timestamp ON analytics_daily;
CREATE TRIGGER analytics_daily_update_timestamp
BEFORE UPDATE ON analytics_daily FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- TRIGGERS FOR BUSINESS LOGIC
-- ============================================================================

-- Validate rental duration and calculate totals
DROP TRIGGER IF EXISTS validate_rental_times ON rentals;
CREATE TRIGGER validate_rental_times
BEFORE INSERT OR UPDATE ON rentals FOR EACH ROW
EXECUTE FUNCTION validate_rental_duration();

-- Validate payment status transitions
DROP TRIGGER IF EXISTS validate_payment_transitions ON payments;
CREATE TRIGGER validate_payment_transitions
BEFORE UPDATE ON payments FOR EACH ROW
EXECUTE FUNCTION validate_payment_status_transition();

-- Auto-activate rental when payment confirmed
DROP TRIGGER IF EXISTS activate_rental_on_payment ON payments;
CREATE TRIGGER activate_rental_on_payment
AFTER UPDATE ON payments FOR EACH ROW
EXECUTE FUNCTION auto_activate_rental_on_payment();

-- Update miner revenue when rental completes
DROP TRIGGER IF EXISTS update_miner_revenue_trigger ON rentals;
CREATE TRIGGER update_miner_revenue_trigger
AFTER UPDATE ON rentals FOR EACH ROW
EXECUTE FUNCTION update_mineur_revenue();

-- ============================================================================
-- STORED PROCEDURES FOR MAINTENANCE TASKS
-- ============================================================================

-- Procedure to execute daily maintenance
CREATE OR REPLACE FUNCTION daily_maintenance()
RETURNS void AS $$
BEGIN
  -- Clean up expired challenges
  DELETE FROM challenges WHERE expires_at < NOW();
  
  -- Archive old rentals
  PERFORM archive_old_rentals();
  
  -- Calculate analytics for yesterday
  PERFORM calculate_daily_analytics(CURRENT_DATE - INTERVAL '1 day');
  
  -- Clean up old audit logs (> 2 years)
  DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;

-- Procedure to recalculate analytics for a date range
CREATE OR REPLACE FUNCTION recalculate_analytics(
  start_date DATE,
  end_date DATE
)
RETURNS INTEGER AS $$
DECLARE
  current_date DATE;
  count INTEGER := 0;
BEGIN
  current_date := start_date;
  WHILE current_date <= end_date LOOP
    PERFORM calculate_daily_analytics(current_date);
    count := count + 1;
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
  RETURN count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INSERT MIGRATION RECORD
-- ============================================================================

INSERT INTO migration_history (version, filename, description, status)
VALUES (4, '004_add_triggers_functions.sql', 'Triggers and functions for automation and business logic', 'success')
ON CONFLICT (version) DO NOTHING;
