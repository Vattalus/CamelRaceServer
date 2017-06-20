handlers.skipTutorial = function(args, content)
{
  var mC = CheckMaintenanceAndVersion(args);
  if(mC != "OK") return generateMaintenanceOrUpdateObj(mC);

  var tc=server.GetPlayerStatistics(
  {
     PlayFabId: currentPlayerId,
     StatisticNames: ["TrophyCount"]
  });
  var trophyCount = 0;
  if(tc.Statistics.length != 0)
  {
    trophyCount = tc.Statistics[0].Value;
  }
  trophyCount = Number(trophyCount);

  if(trophyCount <= 0)
  {
  	trophyCount = 1;
  }

  var suArray = [];
  //var su = {StatisticName: "WinLoss", Version : "0", Value: wlStatInt};
  //suArray.push(su);
  var sut = {StatisticName: "TrophyCount", Value: trophyCount};
  suArray.push(sut);

  var updateRequest = server.UpdatePlayerStatistics(
  {
    PlayFabId: currentPlayerId,
    Statistics: suArray
  }
  );
  return {"trophies" : trophyCount};
}
