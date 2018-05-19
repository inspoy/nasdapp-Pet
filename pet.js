'use strict'

const ADMIN_ADDRESS = "n1ZHFTqNWaGxPnbQ6iyiWb3PxWBTGanGCkM";
const ADMIN_ADDRESS2 = "n1R4URiyBKoPFdJJASKXKCG9ZN87yneyuM5";
//玩耍的间隔
const PLAY_INTERNAL = 0.5 * 60 * 1000;
//喂食的间隔
const FEED_INTERNAL = 0.5 * 60 * 1000;
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
//双倍经验卡价格
const DOUBLE_SCORE_PRICE = 0.01;

//与宠物玩耍得分
const SCORE_PLAY_WITH_PET = 10;
//喂养宠物得分
const SCORE_FEED_WITH_PET = 10;

//宠物成神得分
const SCORE_PET_GOD = 100;
//宠物死亡的分数
const SCORE_PET_DIE = -100;
//手续费
const TAX = new BigNumber(0.1);

var PetContract = function () {
    //user's game data
    LocalContractStorage.defineMapProperty(this, "gameDatas");

    LocalContractStorage.defineMapProperty(this, "gameDataIndex");

    //total user count
    LocalContractStorage.defineProperty(this, "userCount");


    LocalContractStorage.defineProperty(this, "totalTax");

    LocalContractStorage.defineProperty(this, "balance", {
        stringify: function (obj) {
            return obj.toString();
        },
        parse: function (str) {
            return new BigNumber(str);
        }
    });
}

// the game data for single player
var GameData = function (from) {

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
    this.lastFeedTimeMillis = currentTimeMillis - FEED_INTERNAL;
    //this is a value between 0 and 1
    this.mood = 0.1;
    //last play time
    this.lastPlayTimeMillis = currentTimeMillis - PLAY_INTERNAL;

    this.generation = 0;

    //死亡宠物数量
    this.diedCount = 0;

    //总分数， 每喂食一次加一分，玩耍一次加一分，成神一只加十分，小鸡死亡减十分
    this.score = 0;

    //双倍积分卡截止时间
    this.doubleScoreTimeMillis = currentTimeMillis;

    //总共支付的nas
    this.totalPaidNas = 0;

    //总共获得的nas
    this.totalRewardNas = 0;
}

PetContract.prototype = {
    init: function () {
        this.userCount = 0;
        this.balance = new BigNumber(0);
        this.totalTax = 0;
    },

    /**
     * get a pet if already have data or create.
     */
    getPetInfo: function () {

        var userAddress = Blockchain.transaction.from;

        var gameData = this.getGameData();

        if (!gameData) {
            gameData = new GameData(userAddress);
            this.gameDataIndex.put(this.userCount, userAddress);
            this.userCount = this.userCount + 1;
        }

        var zero = new Date();
        zero.setHours(0);
        zero.setMinutes(0);
        zero.setSeconds(0);
        var todayZeroTimeMillis = zero.getTime();


        var currentTimeMillis = Date.parse(new Date());

        //上次喂养时间距离现在喂养时间降低的饱食度  每分钟降低一点。
        var feedDValue = (currentTimeMillis - gameData.lastFeedTimeMillis) / FEED_VALUE_DOWN_SPEED;

        var newFeedValue = gameData.feedValue - feedDValue;

        //饱食度透支100则，则小鸡死亡
        if (newFeedValue < -100) {
            gameData.exp = 0;
            gameData.feedValue = 0;
            gameData.mood = 0.1;
            gameData.diedCount = gameData.diedCount + 1;
            gameData.score = gameData.score + SCORE_PET_DIE;
            gameData.lastFeedTimeMillis = currentTimeMillis;
            gameData.lastPlayTimeMillis = currentTimeMillis;
            this.saveGameData(gameData);
            return "宠物死亡！";
        }
        //更新饱食度
        gameData.feedValue = newFeedValue;

        //每天0点更新状态：

        //喂养次数清零
        if (gameData.lastFeedTimeMillis < todayZeroTimeMillis) {
            gameData.feedCount = 0;
        }

        //心情清零
        if (gameData.lastPlayTimeMillis < todayZeroTimeMillis) {
            gameData.mood = 0.1;
        }

        this.saveGameData(gameData);
        return gameData;

    },


    playWithPet: function () {
        var gameData = this.getGameData();

        if (!gameData) {
            throw new Error("没有找到游戏数据,如果首次玩耍,请等待区块确认");
        }


        var currentTimeMillis = Date.parse(new Date());

        if (currentTimeMillis - gameData.lastPlayTimeMillis < PLAY_INTERNAL) {
            throw new Error("玩耍间隔太短, " + (PLAY_INTERNAL - (currentTimeMillis - gameData.lastPlayTimeMillis))/1000) + " 秒后可再次玩耍";
        }

        //如果处于双倍积分卡时间内
        if (gameData.doubleScoreTimeMillis > currentTimeMillis) {
            gameData.score = gameData.score + SCORE_PLAY_WITH_PET * 2;
        } else {
            gameData.score = gameData.score + SCORE_PLAY_WITH_PET;
        }

        gameData.mood = gameData.mood * MOOD_GROWTH;

        //心情值最大为1
        if (gameData.mood > 1) {
            gameData.mood = 1;
        }
        gameData.lastPlayTimeMillis = currentTimeMillis;

        this.saveGameData(gameData);
        return "由于你的陪伴，小鸡很开心";
    },


    feedPet: function () {
        var gameData = this.getGameData();

        if (!gameData) {
            throw new Error("没有找到游戏数据,如果首次玩耍,请等待区块确认");
        }

        var currentTimeMillis = Date.parse(new Date());

        // if(gameData.feedCount >MAX_FEED_TIMES){
        //     throw new Error("already feed "+MAX_FEED_TIMES+" times!");
        // }

        if (currentTimeMillis - gameData.lastFeedTimeMillis < FEED_INTERNAL) {
            throw new Error("喂食间隔太短, " + (FEED_INTERNAL - (currentTimeMillis - gameData.lastFeedTimeMillis))/1000) + " 秒后可再次喂食";
        }

        gameData.lastFeedTimeMillis = currentTimeMillis;

        //喂食成功加一分
        if (gameData.doubleScoreTimeMillis > currentTimeMillis) {
            gameData.score = gameData.score + SCORE_FEED_WITH_PET * 2;
        } else {
            gameData.score = gameData.score + SCORE_FEED_WITH_PET;
        }
        //如果饱食度为透支状态，则在下一次喂食的时候，直接回复为0，以获得正确的饱食度
        if (gameData.feedValue < 0) {
            gameData.feedValue = 0;
        }

        gameData.feedValue = gameData.feedValue + FEED_VALUE;        

        //如果饱食度超出上限，则变为最大值
        if (gameData.feedValue > MAX_FEED_VALUE) {
            gameData.feedDValue = MAX_FEED_VALUE;
        }

        gameData.feedCount = gameData.feedCount + 1;


        //增加经验
        gameData.exp = gameData.exp + FEED_EXP * gameData.mood;

        //宠物成神，自动繁殖下一代宠物。
        if (gameData.exp > MAX_EXP) {
            gameData.generation = gameData.generation + 1;
            gameData.exp = 0;
            gameData.feedCount = 0;
            gameData.mood = 0.1;
            gameData.feedValue = 0;
            //成神加十分
            if (gameData.doubleScoreTimeMillis > currentTimeMillis) {
                gameData.score = gameData.score + SCORE_PET_GOD * 2;
            } else {
                gameData.score = gameData.score + SCORE_PET_GOD;
            }
        }
        this.saveGameData(gameData);
        return "喂食成功!";

    },

    getGameData: function () {
        var userAddress = Blockchain.transaction.from;
        var gameData = this.gameDatas.get(userAddress);
        return gameData;
    },

    saveGameData: function (data) {
        var userAddress = Blockchain.transaction.from;
        this.gameDatas.put(userAddress, data);
    },

    saveGameDataByAddress: function (address, data) {
        this.gameDatas.put(address, data);
    },

    getUserCount: function () {
        return this.userCount;
    },

    getRank: function () {
        var userDatas = new Array();
        for (var i = 0; i < this.userCount; i++) {
            var address = this.gameDataIndex.get(i);
            var data = this.gameDatas.get(address);
            userDatas.push({
                score: data.score,
                generation: data.generation,
                diedCount: data.diedCount,
                owner: data.owner
            });
        }
        return userDatas.sort(function (a, b) { return a.score < b.score }).slice(0, 500);

    },

    payForDoubleScore: function () {

        var currentTimeMillis = Date.parse(new Date());

        var fromUser = Blockchain.transaction.from,
            ts = Blockchain.transaction.timestamp,
            txhash = Blockchain.transaction.hash,
            value = Blockchain.transaction.value;
        var gameData = this.getGameData();
        // if(gameData.doubleScoreTimeMillis > currentTimeMillis){
        //     throw new Error("你已经处于双倍积分中，无需购买！");
        // }
        if (value != "10000000000000000") {
            throw new Error("双倍积分卡价格为0.01nas，请检查交易数额:" + value);
        }
        if (gameData.doubleScoreTimeMillis < currentTimeMillis) {
            gameData.doubleScoreTimeMillis = currentTimeMillis + 1000 * 60 * 60;
        } else {
            gameData.doubleScoreTimeMillis = gameData.doubleScoreTimeMillis + 1000 * 60 * 60;
        }

        gameData.totalPaidNas = gameData.totalPaidNas + 0.01;
        this.totalTax = this.totalTax + 0.01;
        this.saveGameData(gameData);

        //收取手续费
        Blockchain.transfer(ADMIN_ADDRESS, value.times(TAX).div(2));
        Blockchain.transfer(ADMIN_ADDRESS2, value.times(TAX).div(2));
        var one = new BigNumber(1);
        this.balance = this.balance.plus(value.times(one.minus(TAX)));

        //计算余额，分发奖金给排行榜前十用户
        var maxBanlance = new BigNumber(500000000000000000);

        if (this.balance.gt(maxBanlance)) {
            //TODO 分钱给排行榜用户 
            var users = this.getRank().slice(0, 10);

            var length = users.length;

            for (var i = 0; i < length; i++) {
                var address = users[i].owner;
                if (i == 0) {
                    var nas1 = new BigNumber(120000000000000000);
                    Blockchain.transfer(address, nas1);
                    var gameData1 = this.getGameData(address);
                    gameData1.totalRewardNas = gameData1.totalRewardNas + 0.12;
                    this.balance = this.balance.minus(nas1);
                    this.saveGameDataByAddress(address, gameData1);
                } else if (i == 1) {
                    var nas2 = new BigNumber(80000000000000000);
                    Blockchain.transfer(address, nas2);
                    var gameData2 = this.getGameData(address);
                    gameData2.totalRewardNas = gameData2.totalRewardNas + 0.08;
                    this.balance = this.balance.minus(nas2);
                    this.saveGameDataByAddress(address, gameData2);
                } else if (i >= 2 && i < 6) {
                    var nas3 = new BigNumber(50000000000000000);
                    Blockchain.transfer(address, nas3);
                    this.balance = this.balance.minus(nas3);
                    var gameData3 = this.getGameData(address);
                    gameData3.totalRewardNas = gameData3.totalRewardNas + 0.05;
                    this.saveGameDataByAddress(address, gameData3);
                } else {
                    var nas4 = new BigNumber(25000000000000000);
                    Blockchain.transfer(address, nas4);
                    this.balance = this.balance.minus(nas4);
                    var gameData4 = this.getGameData(address);
                    gameData4.totalRewardNas = gameData4.totalRewardNas + 0.025;
                    this.saveGameDataByAddress(address, gameData4);
                }
            }

            var currentTimeMillis = Date.parse(new Date());
            //清空用户积分
            for (var i = 0; i < this.userCount; i++) {
                var address = this.gameDataIndex.get(i);
                var data = this.gameDatas.get(address);
                data.score = 0;
                this.saveGameDataByAddress(address, data);
            }

            
        }


        return "双倍积分卡购买成功！";
    },

    //获取合约余额
    getContractBalance: function () {
        return this.balance;
    },
    getTotalTax : function(){
        var userAddress = Blockchain.transaction.from;
        if(userAddress != ADMIN_ADDRESS && userAddress != ADMIN_ADDRESS2){
            throw new Error("403");
        }
        return this.totalTax;
    }
}

module.exports = PetContract;