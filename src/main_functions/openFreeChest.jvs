handlers.openFreeChest = function(args, context)
{
	var mC = CheckMaintenanceAndVersion(args);
  	if(mC != "OK") return generateMaintenanceOrUpdateObj(mC);
		//let's get the user's slots chest info
	var chestData = server.GetUserInternalData(
	{
		PlayFabId : currentPlayerId,
		Keys : ["ChestFreeStatus"]
	});
	//check user free slots data validity.
	if(chestData.Data.ChestFreeStatus == undefined) return generateErrObj("No Chest Data found!");

	var slotArray = JSON.parse(chestData.Data.ChestFreeStatus.Value);
	var slotFound = -1;
	for(var i = slotArray.length - 1; i >= 0; i--)
	{
		if((slotArray[i].status == 1) || (Number(slotArray[i].TimeUntilArrival) <= Math.floor((new Date().getTime() /1000))))
		{
			log.debug("we found a free chest");
			slotFound = i;
			break;
		}
	}

	if(slotFound == -1) return generateFailObjCustom("FreeSlotsInfo", JSON.parse(chestData.Data.ChestFreeStatus.Value)); // we found no empty slot. The client must be desynced with the server. Let's update it

	//let's figure out the user's league
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
	var cLeague = Number(calculateLeague(trophyCount));

	//let's get the catalog data for chests
	var catalogData = server.GetCatalogItems({CatalogVersion : "Chests"});

	//let's get the chestInfo for freeChest
	var chestInfo;
	for(var i = 0; i < catalogData.Catalog.length; i++)
	{
		if(catalogData.Catalog[i].ItemId == "FreeChest")
		{
			chestInfo = JSON.parse(catalogData.Catalog[i].CustomData);
			break;
		}
	}
	if(chestInfo == undefined) return generateErrObj("Could not find chest with id: " + "FreeChest" + " in the Chests catalog, or this chest's custom data is undefined");

	//let's update the free slot info
	var freeOpenTime = Number(chestInfo.hoursToOpen.split(",")[0]); // we init with first value
	if(isNaN(freeOpenTime)) return generateErrObj("FreeChest open time info is invalid");		

	var d = new Date();
	var currentTimeStampSeconds = Math.floor(Number(d.getTime()) /1000);
	
	var tempMax = currentTimeStampSeconds;
	for(var i = 0; i < slotArray.length; i++)
	{	
		if(tempMax < slotArray[i].TimeUntilArrival)	
			tempMax = slotArray[i].TimeUntilArrival;
	}

	var timeStampOfNextFreeChestArrival = Math.floor(tempMax + freeOpenTime * 60 * 60);

	slotArray[slotFound].status = 0;
	slotArray[slotFound].TimeUntilArrival = timeStampOfNextFreeChestArrival;

	var freeChestSlotInfoString = JSON.stringify(slotArray);
	server.UpdateUserInternalData(
	{
		PlayFabId: currentPlayerId,
		Data: 
		{
			"ChestFreeStatus" : freeChestSlotInfoString
		}
	});

	var chestBounty = GenerateChestBounty(currentPlayerId, "FreeChest", cLeague, chestInfo);

	//let's get the new user inventory
	var outInventory = server.GetUserInventory({PlayFabId: currentPlayerId});
	var returnObject = 
	{
		Result : "OK",
		ChestBounty : chestBounty,
		FreeSlotsInfo : slotArray,
		InventoryChange : outInventory
	}	

	return returnObject;
}
