/**
* Updates the amount of experience the user has based on given variables
* @param {string} catalogId the ID of the catalog holding xp data
* @param {string} itemId the id of the item holding xp data from the given catalog
* @param {string} xpArrayId the id of the object holding xp data from the give item
* @param {int} actionLevel the level of the exectued action (used to get the amount of xp to give)
* @param {bool} updateServer update experience to the server
* @param {int} playerStatistics array containing player experience, if not provided a GetPlayerStatistics will be done
*/
function UpdateExperience(catalogId, itemId, xpArrayId, actionLevel, updateServer, playerStatistics)
{
  //the amount of xp gained at each action level
  var xpGainByLevel = JSON.parse(getCatalogItem(catalogId, itemId).CustomData)[xpArrayId];

  //xp cap to stop the user to level up past a given level
  var lvlThresholds = JSON.parse(getCatalogItem("Balancing", "BalancingItem").CustomData).LevelThresholds;
  var xpCap = lvlThresholds[lvlThresholds.length - 1];

  //get current exprience
  var ps= playerStatistics || server.GetPlayerStatistics({
    PlayFabId: currentPlayerId,
    StatisticNames: ["Experience"]
  }).Statistics;
  var currentExprience = GetValueFromStatistics(ps, "Experience", 0);

  if(currentExprience >= xpCap)
    return xpCap;

  var xpToReceive = 0;
  if(!isNaN(Number(xpGainByLevel))){
    //action levels are represented by a single number value, the amount to give is xpGain
    xpToReceive = Number(xpGainByLevel);
    if(xpToReceive === 0) return currentExprience;
  }
  else {
    //action levels are represented by an object
    var ln = Number(xpGainByLevel.length);
    if(actionLevel >= ln) actionLevel = ln - 1;
    xpToReceive = Number(xpGainByLevel[actionLevel]);
  }

  //cap and update player's current experience
  currentExprience = Math.min(currentExprience + xpToReceive, xpCap);

  if(!updateServer) return currentExprience;
  var updateRequest = server.UpdatePlayerStatistics(
  {
    PlayFabId: currentPlayerId,
    Statistics: [{StatisticName: "Experience", Version : "0", Value: currentExprience}]
  });
  return currentExprience;
}
