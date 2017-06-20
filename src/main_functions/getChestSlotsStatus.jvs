handlers.getChestSlotsStatus = function(args, context)
{
	var mC = CheckMaintenanceAndVersion(args);
  	if(mC != "OK") return generateMaintenanceOrUpdateObj(mC);

	//let's get the user's chest info
	var chestData = server.GetUserInternalData(
	{
		PlayFabId : currentPlayerId,
		Keys : ["ChestFreeStatus", "ChestSlotsStatus"]
	});
	var chestSlotInfo;
	var freeChestSlotInfo;
	if(chestData.Data.ChestFreeStatus == undefined)
	{
		//let's get the catalog data for our chests
		var catalogData = server.GetCatalogItems(
		{
			CatalogVersion : "Chests"
		});

		var freeChestInfo;

		for(var i = 0; i < catalogData.Catalog.length; i++)
		{
			if(catalogData.Catalog[i].ItemId == "FreeChest")
			{
				freeChestInfo = JSON.parse(catalogData.Catalog[i].CustomData);
				break;
			}
		}

		if(freeChestInfo == undefined) return generateErrObj("Chest catalog has no freechestinfo");

		var freeOpenTime = Number(freeChestInfo.hoursToOpen.split(",")[0]); // we init with first value
		if(isNaN(freeOpenTime)) return generateErrObj("FreeChest open time info is invalid");		

		var d = new Date();
		var currentTimeStampSeconds = Math.floor(Number(d.getTime()) /1000);
		var timeStampOfNextFreeChestArrival = Math.floor(currentTimeStampSeconds + freeOpenTime * 60 * 60);

		freeChestSlotInfo = [{"status":0,"TimeUntilArrival":timeStampOfNextFreeChestArrival},{"status":1,"TimeUntilArrival":0}];

		var freeChestSlotInfoString = JSON.stringify(freeChestSlotInfo);
		server.UpdateUserInternalData(
		{
			PlayFabId: currentPlayerId,
			Data: 
			{
				"ChestFreeStatus" : freeChestSlotInfoString
			}
		});
		freeChestSlotInfo = freeChestSlotInfoString;
	}
	else
	{
		freeChestSlotInfo = chestData.Data.ChestFreeStatus.Value;
	}

	if(chestData.Data.ChestSlotsStatus == undefined)
	{
		chestSlotInfo = [
						  {
						    "chestId": null,
						    "chestLeague": 0,
						    "status": "Empty",
						    "orderTimeStamp": 0,
						    "arrivalTimeStamp": 0
						  },
						  {
						    "chestId": null,
						    "chestLeague": 0,
						    "status": "Empty",
						    "orderTimeStamp": 0,
						    "arrivalTimeStamp": 0
						  },
						  {
						    "chestId": null,
						    "chestLeague": 0,
						    "status": "Empty",
						    "orderTimeStamp": 0,
						    "arrivalTimeStamp": 0
						  },
						  {
						    "chestId": null,
						    "chestLeague": 0,
						    "status": "Empty",
						    "orderTimeStamp": 0,
						    "arrivalTimeStamp": 0
						  }
						];

		//let's give older users some starting chests. already ready to open. We'll determine these users as being those who have the ChestsOpen statistic higher than let's say 15
		//get ChestsOpen stat
		var ms=server.GetPlayerStatistics( 
		  {
		     PlayFabId: currentPlayerId,
		     StatisticNames: ["ChestsOpened", "TrophyCount"]
		  }).Statistics;
		var chestsOpened = GetValueFromStatistics(ms, "ChestsOpened", 0);
		var trophies = GetValueFromStatistics(ms, "TrophyCount", 0);
		var cLeague = calculateLeague(trophies);
		if(Number(chestsOpened) > 15)
		{
			chestSlotInfo[0].chestId = "GoldChest";
			chestSlotInfo[0].chestLeague = cLeague;
			chestSlotInfo[0].status = "Arrived";
			chestSlotInfo[0].arrivalTimeStamp = 0;
			chestSlotInfo[0].orderTimeStamp = 1;
		}

		var chestSlotInfoString = JSON.stringify(chestSlotInfo);
		server.UpdateUserInternalData(
		{
			PlayFabId: currentPlayerId,
			Data: 
			{
				"ChestSlotsStatus" : chestSlotInfoString
			}
		});
		chestSlotInfo = chestSlotInfoString;
	}
	else
	{
		chestSlotInfo = chestData.Data.ChestSlotsStatus.Value;
	}

	var r = {
		"Result" : "OK",
		"ChestSlotInfo" : JSON.parse(chestSlotInfo),
		"FreeSlotsInfo" : JSON.parse(freeChestSlotInfo)
	}
	return r;
}
