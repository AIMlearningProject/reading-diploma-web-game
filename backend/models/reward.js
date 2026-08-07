import db from '../db/db.js'

const Reward = {
    async add({ owner, reward_type, name }, dbConn = db){
        return dbConn('rewards')
            .insert({ owner, reward_type, name })
            .returning('*')
    },

    async getByNameAndOwner(owner, name, dbConn = db){
        return dbConn('rewards')
            .select('owner', 'reward_type', 'name')
            .where({ owner:Number(owner), name:String(name) })
            .first()
    },

    async getUserRewards(owner, dbConn = db){
        return dbConn('rewards')
            .select('id', 'reward_type', 'name')
            .where({ owner })
    }
}

export default Reward