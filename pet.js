'use strict'

const PLAY_INTERNAL = 3 * 60 * 1000 ;

const FEED_INTERNAL = 3 * 60 * 1000 ;

const MAX_FEED_TIMES = 3;

const FEED_EXP = 10;

var PetContract = function(){
    //user's game data
    LocalContractStorage.defineMapProperty(this,"gameDatas");
    
    //total user count
    LocalContractStorage.defineProperty(this,"userCounts");

}

// the game data for single player
var GameData = function(from){

    var zero = new Date();
        zero.setHours(0);
        zero.setMinutes(0);
        zero.setSeconds(0);
    var todayZeroTimeMillis = zero.getTime();

    //pet owner
    this.owner = from;
    //pet experience
    this.exp = 0;
    //day feed count
    this.feedCount = 0;
    //last feed time
    this.lastFeedTimeMillis = todayZeroTimeMillis;
    //this is a value between 0 and 1
    this.mood = 0.1;
    //last play time
    this.lastPlayTimeMillis = todayZeroTimeMillis;
}

PetContract.prototype = {
    init:function(){},

    /**
     * get a pet if already have data or create.
     */
    getPetInfo:function(){
        
        var userAddress = Blockchain.transaction.from;

        var gameData = this.getGameData();
        
        if(!gameData){
            gameData = new GameData(userAddress);
        }

        var zero = new Date();
        zero.setHours(0);
        zero.setMinutes(0);
        zero.setSeconds(0);
        var todayZeroTimeMillis = zero.getTime();
        
        //clear count after 00:00:00
        if(gameData.lastFeedTimeMillis < todayZeroTimeMillis){
            gameData.feedCount = 0;
        }

        if(gameData.lastPlayTimeMillis < todayZeroTimeMillis){
            gameData.lastPlayTimeMillis = 0;
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


        gameData.mood = gameData.mood * 1.3;

        gameData.lastPlayTimeMillis = currentTimeMillis;

        this.saveGameData(gameData);
        
    },


    feedPet:function(){
        var gameData = this.getGameData();

        if(!gameData){
            throw new Error("no game data found!");
        }

        var currentTimeMillis = Date.parse(new Date());

        if(gameData.feedCount >MAX_FEED_TIMES){
            throw new Error("already feed 3 times!");
        }

        if(currentTimeMillis - gameData.lastFeedTimeMillis < PLAY_INTERNAL){
            throw new Error("cann't feed the pet until " + (gameData.lastFeedTimeMillis+PLAY_INTERNAL));
        }

        gameData.lastFeedTimeMillis = currentTimeMillis;
        gameData.feedCount = gameData.feedCount + 1;
        gameData.exp = gameData.exp + FEED_EXP * gameData.mood;
        this.saveGameData(gameData);

    },

    getGameData : function(){
        var userAddress = Blockchain.transaction.from;
        var gameData = this.gameDatas.get(userAddress);
        return gameData;
    },

    saveGameData : function(data){
        var userAddress = Blockchain.transaction.from;
        this.gameDatas.put(userAddress,data);
    }
}

module.exports = PetContract;