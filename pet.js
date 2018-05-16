'use strict'
//玩耍的间隔
const PLAY_INTERNAL = 1 * 60 * 1000 ;
//喂食的间隔
const FEED_INTERNAL = 1 * 60 * 1000 ;
//最大喂养次数
const MAX_FEED_TIMES = 10;
//饱食度最大值
const MAX_FEED_VALUE = 100;
//喂一次增加的饱食度
const FEED_VALUE = 10;
//喂一次增加的经验值基数
const FEED_EXP = 10;
//心情值增长系数
const MOOD_GROWTH = 1.3;
//饱食度下降速度    每x分钟下降一点
const FEED_VALUE_DOWN_SPEED = 60 * 1000 * 10;
//成神所需要的经验值
const MAX_EXP = 100;

var PetContract = function(){
    //user's game data
    LocalContractStorage.defineMapProperty(this,"gameDatas");
    
    //total user count
    LocalContractStorage.defineProperty(this,"userCount");

}

// the game data for single player
var GameData = function(from){

    var zero = new Date();
        zero.setHours(0);
        zero.setMinutes(0);
        zero.setSeconds(0);
    var todayZeroTimeMillis = zero.getTime();

    var currentTimeMillis = Date.parse(new Date());

    //pet owner
    this.owner = from;
    //pet experience
    this.exp = 0;
    //day feed count
    this.feedCount = 0;
    //饱食度
    this.feedValue = 0;
    //last feed time
    this.lastFeedTimeMillis = currentTimeMillis;
    //this is a value between 0 and 1
    this.mood = 0.1;
    //last play time
    this.lastPlayTimeMillis = currentTimeMillis;
    
    this.generation = 0;

    //死亡宠物数量
    this.diedCount = 0;

    //总分数， 每喂食一次加一分，玩耍一次加一分，成神一只加十分，小鸡死亡减十分
    this.score = 0;
}

PetContract.prototype = {
    init:function(){
        this.userCount = 0;
    },

    /**
     * get a pet if already have data or create.
     */
    getPetInfo:function(){
        
        var userAddress = Blockchain.transaction.from;

        var gameData = this.getGameData();
        
        if(!gameData){
            gameData = new GameData(userAddress);
            this.userCount = this.userCount + 1;
        }

        var zero = new Date();
        zero.setHours(0);
        zero.setMinutes(0);
        zero.setSeconds(0);
        var todayZeroTimeMillis = zero.getTime();


        var currentTimeMillis = Date.parse(new Date());

        //上次喂养时间距离现在喂养时间降低的饱食度  每分钟降低一点。
        var feedDValue = (currentTimeMillis -  gameData.lastFeedTimeMillis) / FEED_VALUE_DOWN_SPEED;
        
        var newFeedValue = gameData.feedValue - feedDValue;
        
        //饱食度透支100则，则小鸡死亡
        if(newFeedValue < -100){
            gameData.exp = 0;
            gameData.feedValue = 0;
            gameData.mood = 0.1;
            gameData.diedCount = gameData.diedCount + 1;
            gameData.score = gameData.score - 10;
            gameData.lastFeedTimeMillis = currentTimeMillis;
            gameData.lastPlayTimeMillis = currentTimeMillis;
            this.saveGameData(gameData);
            return "pet died!";
        }
        //更新饱食度
        gameData.feedValue = newFeedValue;

        //每天0点更新状态：

        //喂养次数清零
        if(gameData.lastFeedTimeMillis < todayZeroTimeMillis){
            gameData.feedCount = 0;
        }

        //心情清零
        if(gameData.lastPlayTimeMillis < todayZeroTimeMillis){
            gameData.mood = 0.1;
        }
        
        this.saveGameData(gameData);
        return gameData;

    },


    playWithPet:function(){
        var gameData = this.getGameData();

        if(!gameData){
            throw new Error("no game data found!");
        }


        var currentTimeMillis = Date.parse(new Date());

        if(currentTimeMillis - gameData.lastPlayTimeMillis < PLAY_INTERNAL){
            throw new Error("cann't play with pet until " + (gameData.lastPlayTimeMillis+PLAY_INTERNAL));
        }

        gameData.score = gameData.score + 1;
        gameData.mood = gameData.mood * MOOD_GROWTH;

        //心情值最大为1
        if(gameData.mood > 1){
            gameData.mood = 1;
        }
        gameData.lastPlayTimeMillis = currentTimeMillis;

        this.saveGameData(gameData);
        return "your pet very happy";
    },


    feedPet:function(){
        var gameData = this.getGameData();

        if(!gameData){
            throw new Error("no game data found!");
        }

        var currentTimeMillis = Date.parse(new Date());

        if(gameData.feedCount >MAX_FEED_TIMES){
            throw new Error("already feed "+MAX_FEED_TIMES+" times!");
        }

        if(currentTimeMillis - gameData.lastFeedTimeMillis < PLAY_INTERNAL){
            throw new Error("cann't feed the pet until " + (gameData.lastFeedTimeMillis+PLAY_INTERNAL));
        }

        gameData.lastFeedTimeMillis = currentTimeMillis;

        //喂食成功加一分
        gameData.score = gameData.score + 1;

        //如果饱食度为透支状态，则在下一次喂食的时候，直接回复为0，以获得正确的饱食度
        if(gameData.feedValue < 0){
            gameData.feedValue = 0;
        }

        //如果饱食度超出上限，则变为最大值
        if(gameData.feedValue > MAX_FEED_VALUE){
            gameData.feedDValue = MAX_FEED_VALUE;
        }

        gameData.feedValue = gameData.feedValue + FEED_VALUE;
        gameData.feedCount = gameData.feedCount + 1;


        //增加经验
        gameData.exp = gameData.exp + FEED_EXP * gameData.mood;

        //宠物成神，自动繁殖下一代宠物。
        if(gameData.exp > MAX_EXP){
            gameData.generation = gameData.generation + 1;
            gameData.exp = 0;
            gameData.feedCount = 0;
            gameData.mood = 0.1;
            gameData.feedValue = 0;
            //成神加十分
            gameData.score = gameData.score + 10;
        }
        this.saveGameData(gameData);
        return "feed success!";

    },

    getGameData : function(){
        var userAddress = Blockchain.transaction.from;
        var gameData = this.gameDatas.get(userAddress);
        return gameData;
    },

    saveGameData : function(data){
        var userAddress = Blockchain.transaction.from;
        this.gameDatas.put(userAddress,data);
    },

    getUserCount :function(){
        return this.userCount;
    },

    // getRank:function(){
    //     var userDatas = new Array();
    //     // convert map to array
    //     this.gameDatas.forEach(value, key, map => {
    //         userDatas.push({user:key,exp:value.exp});
    //     });
        
    //     // var sortUserData = userDatas.sort(function(x,y){return x.exp<y.exp})
    //     return userDatas;

    // }
}

module.exports = PetContract;