'use strict'



var PetContract = function(){
    //user's game data
    LocalContractStorage.defineMapProperty(this,"gameDatas");
    
    //total user count
    LocalContractStorage.defineProperty(this,"userCounts");

}

// the game data for single player
var GameData = function(from){
    //pet owner
    this.owner = from;
    //pet experience
    this.exp = 0;
    //day feed count
    this.feedCount = 0;
    //last feed time
    this.lastFeedTimeMillis = Date.parse(new Date());
    //this is a value between 0 and 1
    this.mood = 0.1;
    //last play time
    this.lastPlayTimeMillis = Date.parse(new Date());
}

PetContract.prototype = {
    init:function(){},

    /**
     * get a pet if already have data or create.
     */
    getPetInfo:function(){
        var userAddress = Blockchain.transaction.from;
        
        var gameData = this.gameDatas.get(from);
        
        if(!gameData){
            gameData = new gameData(userAddress);
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
        
        this.gameData.put(from,gameData);
        return gameData;

    }


    playWithPet(){

    }
}