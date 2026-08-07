import express from 'express'
import RewardService from '../services/rewardService.js'
import { z } from 'zod'
import middleware from '../utils/middleware.js'

const rewardsRouter = express.Router()

const rewardAddSchema = z.object({
    owner: z.number(),
    reward_type: z.string(),
    name: z.string()
}).strict()

rewardsRouter.post('/add-reward', middleware.requireAuthentication(true), middleware.zValidate(rewardAddSchema), async(request, response, next) => {
    const { owner, reward_type, name } = request.validated

    try{
        const newReward = {
            owner,
            reward_type,
            name
        }
        await RewardService.addReward(newReward)
        response.status(201).json(newReward)
    }catch(error){
        next(error)
    }
})

rewardsRouter.get('/', middleware.requireAuthentication(true), async(request, response, next) => {
    try {
        const rewards = await RewardService.getUserRewards(request.user.id)
        response.status(200).json(rewards)
    } catch(error){
        next(error)
    }
})

export default rewardsRouter