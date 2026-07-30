import Reward from '../models/reward.js'

const RewardService = {
    async addReward({ owner, reward_type, reward }) {
        const existing = await Reward.getByRewardAndUser(owner, reward)
        if (existing) {
            const err = new Error('User already has this reward')
            err.userDetails = 'Sinulla on jo tämä palkinto'
            err.status = 400
            throw err
        }
        return await Reward.add({
            owner,
            reward_type,
            reward
        })
    },

    async getUserRewards(owner) {
        const rewards = await Reward.getUserRewards(owner)
        if (!rewards) {
            const err = new Error('No rewards found for this user')
            err.userDetails = 'Ei palkintoja vielä'
            err.status = 404
            throw err
        }
        return rewards
    }
}

export default RewardService