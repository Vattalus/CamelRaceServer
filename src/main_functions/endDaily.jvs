handlers.endDaily = function(args, context) 
{
	var mC = CheckMaintenanceAndVersion(args);
  	if(mC != "OK") return generateMaintenanceOrUpdateObj(mC);
  	
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
	 var totalMinutes = 600;
	 tParsed = JSON.parse(tData.Data.DailyMissionData);
	 totalMinutes = Number(tParsed.minutesToRefresh);

	var parsedData = JSON.parse(dStatus.Data.DailyMissionStatus.Value);
	var DailyMissionClaimStatus = parsedData.dailyMissionClaimStatus;
  	var DailyStatus = Number(parsedData.DailyStatus);
  	var TimeRemaining = -1;


	var dataArr;
	for(var i = 0; i < tParsed.missionData.length; i++)
	{
		dataArr = tParsed.missionData[i].split("_");
		if(dataArr.length < 4) generateErrObj("Title data is invalid!");
		if(dataArr[3] == "OFF") DailyMissionClaimStatus[i] = -1;
	}


	for(var i = 0; i < parsedData.dailyMissionClaimStatus.length; i++)
	{
		if(DailyMissionClaimStatus[i] == -1) continue; //we don't care aboot these missions anymore
		if(DailyMissionClaimStatus[i] == 0) return generateErrObj("Not all missions were claimed!");
	}
  //all missions claimed so let's give the player what they are due and set the daily mission status

  	DailyMissionClaimStatus = [0,0,0,0,0,0,0,0];

  	var d = new Date();
  	var timeStamp;
	if(d.getTime() - Number(parsedData.timeStamp) > Number(totalMinutes) *60*1000) // minutes *60*1000
	{ // we need to generate a new daily mission for the user in this case
		DailyStatus = 2; //0 <- waiting for daily timer, 1 <- generate daily, 2 <- daily is ongoing
		timeStamp = d.getTime();
	}
	else
	{
		DailyStatus = 0;
		TimeRemaining = (Number(totalMinutes) *60) - (Math.floor((d.getTime() - Number(parsedData.timeStamp))/1000)); // time remaining till next quest in seconds
		timeStamp = parsedData.timeStamp;
	}

	var dailyObject = 
	{
		"DailyStatus" : DailyStatus,
		"dailyMissionClaimStatus" : DailyMissionClaimStatus,
		"timeStamp" : timeStamp
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
/*
	  var invChangeObj;
	  var userInventoryObject = server.GetUserInventory(
	    {
	      PlayFabId: currentPlayerId
	    }
	  );
	  var addUserCurrencyResult;
	  for(var p in args.currencyReq)
	  {
	    if(args.currencyReq[p] > 0)
	    addUserCurrencyResult = server.AddUserVirtualCurrency(
	      {
	        PlayFabId: currentPlayerId,
	        VirtualCurrency : p,
	        Amount: args.currencyReq[p]
	      }
	    );

	  }
	  var itemData;
	  var itemFound = false;
	  var newAmount = 0;
	  //car cards
	  for(var p in args.carCardsRequest)
	  {
	    //log.debug(p + " : " + args.carCardsRequest[p]);
	    if (args.carCardsRequest.hasOwnProperty(p))
	    {
	      itemFound = false;
	      newAmount = 0;
	      //log.debug("looking for: " +p);
	      for(var i = 0; i < userInventoryObject.Inventory.length; i++)
	      {
	        if((userInventoryObject.Inventory[i].ItemId == p) && (userInventoryObject.Inventory[i].CatalogVersion == "CarCards"))
	        {
	          // log.debug("adding amount to: " + userInventoryObject.Inventory[i].ItemInstanceId);
	          if(userInventoryObject.Inventory[i].CustomData == undefined)
	          {
	            newAmount = Number(args.carCardsRequest[p]);
	          }
	          else
	          {
	            if(userInventoryObject.Inventory[i].CustomData.Amount == undefined)
	            newAmount = Number(args.carCardsRequest[p]);
	            else
	            {
	              if(isNaN(Number(userInventoryObject.Inventory[i].CustomData.Amount)))
	              newAmount = Number(args.carCardsRequest[p]);
	              else
	              newAmount = Number(userInventoryObject.Inventory[i].CustomData.Amount) + Number(args.carCardsRequest[p]);
	            }
	          }
	          itemData = {"Amount" : newAmount};
	          server.UpdateUserInventoryItemCustomData(
	            {
	              PlayFabId: currentPlayerId,
	              ItemInstanceId: userInventoryObject.Inventory[i].ItemInstanceId,
	              Data: itemData
	            }
	          );
	          itemFound = true;
	          break;
	        }
	      }
	      if(itemFound == false)
	      {
	        var itemsToGrant = [p];
	        var grantVar = server.GrantItemsToUser(
	          {
	            CatalogVersion : "CarCards",
	            PlayFabId: currentPlayerId,
	            ItemIds : itemsToGrant
	          }
	        );

	        itemData = {"Amount" : args.carCardsRequest[p]};
	        server.UpdateUserInventoryItemCustomData(
	          {
	            PlayFabId: currentPlayerId,
	            ItemInstanceId: grantVar.ItemGrantResults[0].ItemInstanceId,
	            Data: itemData
	          }
	        );
	      }
	    }
	  }
	  //part cards
	  for(var p in args.partCardsRequest)
	  {
	    //log.debug(p + " : " + args.partCardsRequest[p]);
	    if (args.partCardsRequest.hasOwnProperty(p))
	    {
	      itemFound = false;
	      newAmount = 0;
	      // log.debug("looking for: " +p);
	      for(var i = 0; i < userInventoryObject.Inventory.length; i++)
	      {
	        if((userInventoryObject.Inventory[i].ItemId == p) && (userInventoryObject.Inventory[i].CatalogVersion == "PartCards"))
	        {
	          // log.debug("adding amount to: " + userInventoryObject.Inventory[i].ItemInstanceId);
	          if(userInventoryObject.Inventory[i].CustomData == undefined)
	          {
	            newAmount = Number(args.partCardsRequest[p]);
	          }
	          else
	          {
	            if(userInventoryObject.Inventory[i].CustomData.Amount == undefined)
	            newAmount = Number(args.partCardsRequest[p]);
	            else
	            {
	              if(isNaN(Number(userInventoryObject.Inventory[i].CustomData.Amount)))
	              newAmount = Number(args.partCardsRequest[p]);
	              else
	              newAmount = Number(userInventoryObject.Inventory[i].CustomData.Amount) + Number(args.partCardsRequest[p]);
	            }
	          }
	          itemData = {"Amount" : newAmount};
	          server.UpdateUserInventoryItemCustomData(
	            {
	              PlayFabId: currentPlayerId,
	              ItemInstanceId: userInventoryObject.Inventory[i].ItemInstanceId,
	              Data: itemData
	            }
	          );
	          itemFound = true;
	          break;
	        }
	      }
	      if(itemFound == false)
	      {
	        var itemsToGrant = [p];
	        var grantVar = server.GrantItemsToUser(
	          {
	            CatalogVersion : "PartCards",
	            PlayFabId: currentPlayerId,
	            ItemIds : itemsToGrant
	          }
	        );

	        itemData = {"Amount" : args.partCardsRequest[p]};
	        server.UpdateUserInventoryItemCustomData(
	          {
	            PlayFabId: currentPlayerId,
	            ItemInstanceId: grantVar.ItemGrantResults[0].ItemInstanceId,
	            Data: itemData
	          }
	        );
	      }
	    }
	  }
*/
	//let's get user leage info
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
	//let's get the catalog data for daily mission chest
	var catalogData = server.GetCatalogItems({CatalogVersion : "Chests"});
	var chestInfo;
	for(var i = 0; i < catalogData.Catalog.length; i++)
	{
		if(catalogData.Catalog[i].ItemId == "DailyMissionChest")
		{
			chestInfo = JSON.parse(catalogData.Catalog[i].CustomData);
			break;
		}
	}
	if(chestInfo == undefined) return generateErrObj("Could not find chest with id: " + "DailyMissionChest" + " in the Chests catalog, or this chest's custom data is undefined");
	var chestBounty = GenerateChestBounty(currentPlayerId, "DailyMissionChest", cLeague, chestInfo);

	    var outInventory = server.GetUserInventory({PlayFabId: currentPlayerId});
		var dStObj = 
		{
			status : DailyStatus,
			claimStatus : DailyMissionClaimStatus,
			timeRemaining : TimeRemaining
		};

	    var r = {
    		Result: "OK",
    		Message: "DailyCompleted",
    		ChestBounty : chestBounty,
    		InventoryChange:outInventory,
    		"DailyStatus":dStObj
  			};
  	return r;
}

