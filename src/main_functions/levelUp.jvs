handlers.levelUp = function(args, context)
{
	var newLevel = args.level; //user's new level according to client

	var lastLvlReward = 0;
    var lastRewardLevel = server.GetUserReadOnlyData(
    {
      PlayFabId : currentPlayerId,
      Keys : ["LastLevelReward"]
    });
    var levelItemDataToUpdate = {};
    levelItemDataToUpdate["LastLevelReward"] = 0;
    if(lastRewardLevel.Data.LastLevelReward == undefined)
    {
      server.UpdateUserReadOnlyData(
      {
        PlayFabId : currentPlayerId, 
        Data : levelItemDataToUpdate
      }
        );      
    }
    else
    {
    	lastLvlReward = lastRewardLevel.Data.LastLevelReward.Value;
    }

    // now let's see if the user gets a reward
    var lvlThresholds = JSON.parse(getCatalogItem("Balancing", "BalancingItem").CustomData).LevelThresholds;
    //get current exprience
    var ps= server.GetPlayerStatistics(
     {
         PlayFabId: currentPlayerId,
         StatisticNames: ["Experience"]
     }).Statistics;
    var currentExprience = GetValueFromStatistics(ps, "Experience", 0);
    if(currentExprience == 0) // this most likely means that the user doesn't have the exp statistic so let's give it to them
    {
    	 var suArray = [];
	     var su = {StatisticName : "Experience", Version : "0", Value: 0};
	     suArray.push(su);

	     server.UpdatePlayerStatistics(
	     {
	       PlayFabId : currentPlayerId,
	       Statistics: suArray
	     });
    }
    var currLvl = lvlThresholds.length; // user's level according to server
    for(var i = 0; i < lvlThresholds.length; i++)
    {
       if(currentExprience >= lvlThresholds[i]) continue;
       currLvl = i; break;
    }

    if(Number(newLevel) <= Number(lastLvlReward)) return generateFailObj("already got reward for level: " + lastLvlReward);

    if(Number(newLevel) <= Number(currLvl))
    {
    	lastLvlReward = Number(newLevel);
    	levelItemDataToUpdate["LastLevelReward"] = lastLvlReward;
        server.UpdateUserReadOnlyData(
        {
          PlayFabId : currentPlayerId, 
          Data : levelItemDataToUpdate
        }
          );
        //give bundle to user
        //ids of bundles are of the form 001, 002, ... , 012 etc so padded with 0s until it has 3 digits
        var str = "" + lastLvlReward;
        var pad = "000";
        var ans = pad.substring(0, pad.length - str.length) + str; 
        server.GrantItemsToUser(
        {
          CatalogVersion : "LevelUpRewards",
          PlayFabId : currentPlayerId, 
          ItemIds : ans
        }
          );      
        //let's publish to the feed that the user leveled up
        if(Number(currLvl) > 2)
          publishToLiveFeed(currentPlayerId, "levelUp", Number(currLvl));
    }
    else return generateFailObj("You haven't reached this level yet");

    var outInventory = server.GetUserInventory({PlayFabId: currentPlayerId});
    return generateInventoryChange("InventoryUpdated", outInventory);
}
