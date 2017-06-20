handlers.claimDailyMission = function(args, context) 
{
	var mC = CheckMaintenanceAndVersion(args);
  	if(mC != "OK") return generateMaintenanceOrUpdateObj(mC);
  	
	var idx = Number(args.mIdx);
	var dStatus = server.GetUserInternalData(
	{
	    PlayFabId: currentPlayerId,
	    Keys: ["DailyMissionStatus"]
	});
	if(dStatus.Data.DailyMissionStatus == undefined)
	{
		return generateErrObj("No daily mission data found on server");
	}

	var tData = server.GetTitleData(
	    {
	        PlayFabId : currentPlayerId,
	        Keys : ["DailyMissionData"]
	    }
	      );

	var tParsed = JSON.parse(tData.Data.DailyMissionData);
	var dataArr = tParsed.missionData[idx].split("_");
	
	var parsedData = JSON.parse(dStatus.Data.DailyMissionStatus.Value);
	var DailyMissionClaimStatus = parsedData.dailyMissionClaimStatus;

	if(idx >= DailyMissionClaimStatus.length)
	{
		return generateErrObj("Unlock index is out of bounds of playerData claim mission status array");
	}
	if(DailyMissionClaimStatus[idx] == 1) return generateFailObj("Mission already claimed");
	DailyMissionClaimStatus[idx] = 1;

	var dailyObject = 
	{
		"DailyStatus" : parsedData.DailyStatus,
		"dailyMissionClaimStatus" : DailyMissionClaimStatus,
		"timeStamp" : parsedData.timeStamp
	};
	var dailyObjectStringified = JSON.stringify(dailyObject);
	var objectToUpdate = 
	{
		"DailyMissionStatus" : dailyObjectStringified
	}
	server.UpdateUserInternalData(
       {
          PlayFabId: currentPlayerId,
          Data: objectToUpdate
       });

	var rewardCurrency;
	var rewardAmount;
	if(idx >= tParsed.missionData.length)
	{
		return generateErrObj("Unlock index is out of bounds of titleData claim mission reward array");
	}
	
	rewardCurrency = dataArr[1];
	rewardAmount = Number(dataArr[2]);

	var addUserCurrencyResult = server.AddUserVirtualCurrency(
      {
        PlayFabId: currentPlayerId,
        VirtualCurrency : rewardCurrency,
        Amount: rewardAmount
      }
    );
    var currencyUpdated = {};
    currencyUpdated[addUserCurrencyResult.VirtualCurrency] = addUserCurrencyResult.Balance;
    var invChangeObj =
    {
      VirtualCurrency: currencyUpdated
    };
    return generateInventoryChange("MissionClaimed", invChangeObj);
}
