// Usage statistics tracking and management
export class StatsManager {
  async update(results) {
    try {
      const data = await chrome.storage.sync.get(['stats']);
      const stats = data.stats || {
        videosChecked: 0,
        claimsFound: 0,
        accurateClaims: 0,
        lastUsed: null,
        installDate: Date.now()
      };

      stats.videosChecked += 1;
      stats.claimsFound += results.length;
      stats.accurateClaims += results.filter(r => 
        ['True', 'Mostly True'].includes(r.status) && r.confidence >= 75
      ).length;
      stats.lastUsed = Date.now();

      await chrome.storage.sync.set({ stats });
    } catch (error) {
      console.error('Failed to update usage stats:', error);
    }
  }

  async get() {
    try {
      const data = await chrome.storage.sync.get(['stats']);
      return data.stats || {
        videosChecked: 0,
        claimsFound: 0,
        accurateClaims: 0,
        lastUsed: null,
        installDate: Date.now()
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return {
        videosChecked: 0,
        claimsFound: 0,
        accurateClaims: 0,
        lastUsed: null,
        installDate: Date.now()
      };
    }
  }

  async reset() {
    try {
      const resetStats = {
        videosChecked: 0,
        claimsFound: 0,
        accurateClaims: 0,
        lastUsed: null,
        installDate: Date.now()
      };
      
      await chrome.storage.sync.set({ stats: resetStats });
      return resetStats;
    } catch (error) {
      console.error('Failed to reset stats:', error);
      throw error;
    }
  }

  calculateAccuracyRate(stats) {
    return stats.claimsFound > 0 ? 
      Math.round((stats.accurateClaims / stats.claimsFound) * 100) : 0;
  }

  calculateReliabilityScore(stats) {
    if (!stats.videosChecked || stats.videosChecked === 0) return 0;
    
    const accuracyRate = this.calculateAccuracyRate(stats) / 100;
    const usageWeight = Math.min(stats.videosChecked / 50, 1); // Max weight at 50 videos
    const score = Math.round((accuracyRate * 70 + usageWeight * 30) * 100);
    
    return score;
  }

  getUsageTrend(stats) {
    const daysSinceInstall = stats.installDate ? 
      Math.floor((Date.now() - stats.installDate) / (1000 * 60 * 60 * 24)) : 0;
    
    if (daysSinceInstall === 0) return 'NEW';
    
    const videosPerDay = stats.videosChecked / daysSinceInstall;
    
    if (videosPerDay >= 2) return 'HEAVY';
    if (videosPerDay >= 0.5) return 'REGULAR';
    if (videosPerDay >= 0.1) return 'LIGHT';
    return 'MINIMAL';
  }
}