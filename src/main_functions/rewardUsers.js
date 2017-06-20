handlers.rewardUsers = function(args, context) 
{
    var ps = server.GetPlayerStatistics({
      PlayFabId: currentPlayerId,
      StatisticNames: ["Experience","TrophyCount"]
    }).Statistics;
  var currentExprience = GetValueFromStatistics(ps, "Experience", 0); // 0 - 80000
  var currentTrophies = GetValueFromStatistics(ps, "TrophyCount", 0); // 0 - 3000

  var trophyDiff = 0;
  var expToGive = 0;
  if(currentExprience <= 0) 
  {
    trophyDiff = (Number(currentTrophies) / 3000);
    expToGive = Number(Math.floor(trophyDiff * 800));
  }
  currentExprience = Number(currentExprience) + expToGive;

  var updateRequest = server.UpdatePlayerStatistics(
  {
    PlayFabId: currentPlayerId,
    Statistics: [{StatisticName: "Experience", Version : "0", Value: currentExprience}]
  });
  return currentExprience;
}

