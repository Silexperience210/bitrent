import axios from 'axios';

/**
 * Bitaxe Service - Interface with Bitaxe miner devices
 * Allows monitoring and control of rented miners
 */

class BitaxeService {
  constructor() {
    this.timeout = 5000; // 5 second timeout for API calls
  }

  /**
   * Get miner status from Bitaxe API
   * @param {string} minerIp - Miner IP address
   * @returns {Promise<object>}
   */
  async getMinerStatus(minerIp) {
    try {
      const url = `http://${minerIp}/api/system/info`;
      const response = await axios.get(url, { timeout: this.timeout });

      return {
        hashrate: response.data.hashrate,
        temperature: response.data.temperature,
        uptime: response.data.uptime,
        power: response.data.power,
        efficiency: response.data.efficiency,
        raw: response.data,
      };
    } catch (error) {
      console.error(`Bitaxe status error for ${minerIp}:`, error.message);
      return {
        error: true,
        message: `Could not reach miner at ${minerIp}`,
      };
    }
  }

  /**
   * Get miner metrics
   * @param {string} minerIp - Miner IP address
   * @returns {Promise<object>}
   */
  async getMinerMetrics(minerIp) {
    try {
      const url = `http://${minerIp}/api/metrics`;
      const response = await axios.get(url, { timeout: this.timeout });

      return {
        current_hashrate: response.data.current_hashrate,
        average_hashrate: response.data.average_hashrate,
        shares_accepted: response.data.shares_accepted,
        shares_rejected: response.data.shares_rejected,
        difficulty: response.data.difficulty,
        raw: response.data,
      };
    } catch (error) {
      console.error(`Bitaxe metrics error for ${minerIp}:`, error.message);
      return {
        error: true,
        message: `Could not fetch metrics from ${minerIp}`,
      };
    }
  }

  /**
   * Restart miner
   * @param {string} minerIp - Miner IP address
   * @param {string} adminPassword - Admin password if required
   * @returns {Promise<{success: boolean}>}
   */
  async restartMiner(minerIp, adminPassword) {
    try {
      const url = `http://${minerIp}/api/system/restart`;
      const response = await axios.post(
        url,
        { password: adminPassword },
        { timeout: this.timeout }
      );

      return { success: response.status === 200 };
    } catch (error) {
      console.error(`Bitaxe restart error for ${minerIp}:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Set mining pool
   * @param {string} minerIp - Miner IP address
   * @param {object} poolConfig - Pool configuration
   * @returns {Promise<{success: boolean}>}
   */
  async setMiningPool(minerIp, poolConfig) {
    try {
      const url = `http://${minerIp}/api/config/pool`;
      const response = await axios.post(
        url,
        {
          url: poolConfig.url,
          user: poolConfig.user,
          password: poolConfig.password || 'x',
        },
        { timeout: this.timeout }
      );

      return { success: response.status === 200 };
    } catch (error) {
      console.error(`Bitaxe pool config error for ${minerIp}:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Batch check miner statuses
   * @param {object[]} miners - Array of miner objects with ip property
   * @returns {Promise<object[]>}
   */
  async checkMultipleMiners(miners) {
    const results = await Promise.all(
      miners.map(async (miner) => {
        const status = await this.getMinerStatus(miner.ip);
        return {
          id: miner.id,
          ip: miner.ip,
          status,
        };
      })
    );

    return results;
  }
}

export default new BitaxeService();
