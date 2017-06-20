handlers.iapMade = function(args, context)
{
		//this code will fire whenever a IAP is succesfully validated
  	var ps=server.GetPlayerStatistics(
  	{
     	PlayFabId: currentPlayerId,
     	StatisticNames: ["IAPValue"]
  	}).Statistics;

  	var iapVal = Number(GetValueFromStatistics(ps, "IAPValue", 0));

  	//BMBundleInfo

	switch(args.bundle)
	{
		case "co.tamatem.downshiftdrift.gold01":
		iapVal += 99;
		break;
		case "co.tamatem.downshiftdrift.gold02":
		iapVal += 499;
		break;
		case "co.tamatem.downshiftdrift.gold03":
		iapVal += 2499;
		break;
		case "co.tamatem.downshiftdrift.gold04":
		iapVal += 2499;
		break;
		case "co.tamatem.downshiftdrift.gold05":
		iapVal += 4999;
		break;
		case "co.tamatem.downshiftdrift.gold06":
		iapVal += 9999;
		break;
		case "co.tamatem.downshiftdrift.bundle01":
		iapVal += 599;

		  var userInventoryObject = server.GetUserInventory(
		  {
		    PlayFabId: currentPlayerId,
		  }
		  );

		  var custCatalog = server.GetCatalogItems(
		  {
		  	CatalogVersion: "BMBundleInfo"
		  });
		  var ps=server.GetPlayerStatistics(
		  {
		     	PlayFabId: currentPlayerId,
		     	StatisticNames: ["HighestLeagueReached"]
		  }).Statistics;

		  var hlr = Number(GetValueFromStatistics(ps, "HighestLeagueReached", 1));
		  var bundleName = "bundle01league";
		  if(hlr < 10) bundleName = bundleName + "0" + hlr;
		  else bundleName += hlr;
		  if(args.debug == true) log.debug("consuming: " + bundleName);


		  var bundleInfo;
		  for(var i = 0; i < custCatalog.Catalog.length; i++)
		  {
		      if(custCatalog.Catalog[i].ItemId == bundleName)
		      {
		      	bundleInfo = JSON.parse(custCatalog.Catalog[i].CustomData)
		      	break;
		      }
		  }

		  if(bundleInfo == undefined) return generateErrObj("Catalog item: " + bundleName + " not found");
		  for(var i = 0; i < userInventoryObject.Inventory.length; i++)
		  {		  	
		  	if(userInventoryObject.Inventory[i].ItemId == args.bundle)
		  	{
		  		//consume item
		  		try
		  		{
			  		var cons = server.ConsumeItem(
			  		{
			  			PlayFabId: currentPlayerId,
			  			ItemInstanceId : userInventoryObject.Inventory[i].ItemInstanceId,
			  			ConsumeCount : 1
			  		});
		  		}
		  		catch(err)
		  		{
		  			return generateErrObj("err: " + err);
		  		}
		  		//check if consumption was succesfull

		  		//prepare object to send to client for inventory refresh purposes
		  		var invData;
		  		var objectsUpdated = [];
		  		var currencyUpdated = {};
				  //we now have to parse the bundleinfo to get it's contents
				  //HC
				  if(bundleInfo.HCRange != undefined)
				  {
			  		if(args.debug == true) log.debug("found HCRange: " + bundleInfo.HCRange);
			  		var splitInfo = bundleInfo.HCRange.split(",");
			  		var hcAmount = 1;
			  		if(splitInfo.length >= 2)
			  		{
				  		if(Number(splitInfo[0]) < Number(splitInfo[1]))
				  		{
							hcAmount = Number(splitInfo[0]) + Math.floor(Math.random() * (Number(splitInfo[1]) - Number(splitInfo[0])));
				  		}
				  		else
				  		{
				  			hcAmount = Number(splitInfo[0]);
				  		}
			  		}
			  		else
			  		{
			  			return generateErrObj("Catalog data corrupt");
			  		}

			  		if(hcAmount > 0)
			  		{
					    addUserCurrencyResult = server.AddUserVirtualCurrency(
					      {
					        PlayFabId: currentPlayerId,
					        VirtualCurrency : "HC",
					        Amount: hcAmount
					      }
					    );

					    currencyUpdated[addUserCurrencyResult.VirtualCurrency] = addUserCurrencyResult.Balance;
					}
				  }

				  //SC
				  if(bundleInfo.SCRange != undefined)
				  {
			  		if(args.debug == true) log.debug("found SCRange: " + bundleInfo.SCRange);

			  		var splitInfo = bundleInfo.SCRange.split(",");
			  		var scAmount = 1;
			  		if(splitInfo.length >= 2)
			  		{
				  		if(Number(splitInfo[0]) < Number(splitInfo[1]))
				  		{
							scAmount = Number(splitInfo[0]) + Math.floor(Math.random() * (Number(splitInfo[1]) - Number(splitInfo[0])));
				  		}
				  		else
				  		{
				  			scAmount = Number(splitInfo[0]);
				  		}
			  		}
			  		else
			  		{
			  			return generateErrObj("Catalog data corrupt");
			  		}

			  		if(scAmount > 0)
			  		{
					    addUserCurrencyResult = server.AddUserVirtualCurrency(
					      {
					        PlayFabId: currentPlayerId,
					        VirtualCurrency : "SC",
					        Amount: scAmount
					      }
					    );
					    currencyUpdated[addUserCurrencyResult.VirtualCurrency] = addUserCurrencyResult.Balance;
					}
				  }

				  //Engine
				  if(bundleInfo.Engine != undefined)
				  {
			  		if(args.debug == true) log.debug("found Engine: " + bundleInfo.Engine);
			  		var splitInfo = bundleInfo.Engine.split(",");
			  		if(splitInfo.length >= 2)
			  		{
			  			var res = GiveUserPart("Engine", splitInfo[0], splitInfo[1], userInventoryObject);
			  			objectsUpdated.push(res);
			  		}
			  		else
			  			return generateErrObj("Catalog data corrupt");
				  }

				  //Exhaust
				  if(bundleInfo.Exhaust != undefined)
				  {
			  		if(args.debug == true) log.debug("found Exhaust: " + bundleInfo.Exhaust);
			  		var splitInfo = bundleInfo.Exhaust.split(",");
			  		if(splitInfo.length >= 2)
			  		{
			  			var res = GiveUserPart("Exhaust", splitInfo[0], splitInfo[1], userInventoryObject);
			  			objectsUpdated.push(res);
			  		}
			  		else
			  			return generateErrObj("Catalog data corrupt");
				  }

				  //Gearbox
				  if(bundleInfo.Gearbox != undefined)
				  {
			  		if(args.debug == true) log.debug("found Gearbox: " + bundleInfo.Gearbox);
			  		var splitInfo = bundleInfo.Gearbox.split(",");
			  		if(splitInfo.length >= 2)
			  		{
			  			var res = GiveUserPart("Gearbox", splitInfo[0], splitInfo[1], userInventoryObject);
			  			objectsUpdated.push(res);
			  		}
			  		else
			  			return generateErrObj("Catalog data corrupt");
				  }

				  //Suspension
				  if(bundleInfo.Suspension != undefined)
				  {
			  		if(args.debug == true) log.debug("found Suspension: " + bundleInfo.Suspension);
			  		var splitInfo = bundleInfo.Suspension.split(",");
			  		if(splitInfo.length >= 2)
			  		{
			  			var res = GiveUserPart("Suspension", splitInfo[0], splitInfo[1], userInventoryObject);
			  			objectsUpdated.push(res);
			  		}
			  		else
			  			return generateErrObj("Catalog data corrupt");
				  }

				  //Tires
				  if(bundleInfo.Tires != undefined)
				  {
			  		if(args.debug == true) log.debug("found Tires: " + bundleInfo.Tires);
			  		var splitInfo = bundleInfo.Tires.split(",");
			  		if(splitInfo.length >= 2)
			  		{
			  			var res = GiveUserPart("Tires", splitInfo[0], splitInfo[1], userInventoryObject);
			  			objectsUpdated.push(res);
			  		}
			  		else
			  			return generateErrObj("Catalog data corrupt");
				  }

				  //Turbo
				  if(bundleInfo.Turbo != undefined)
				  {
			  		if(args.debug == true) log.debug("found Turbo: " + bundleInfo.Turbo);
			  		var splitInfo = bundleInfo.Turbo.split(",");
			  		if(splitInfo.length >= 2)
			  		{
			  			var res = GiveUserPart("Turbo", splitInfo[0], splitInfo[1], userInventoryObject);
			  			objectsUpdated.push(res);
			  		}
			  		else
			  			return generateErrObj("Catalog data corrupt");
				  }

				  //CarCard
				  if(bundleInfo.CarCard != undefined)
				  {
			  		if(args.debug == true) log.debug("found CarCard: " + bundleInfo.CarCard);

					  //CarCardAmount
					  if(bundleInfo.CarCardAmount != undefined)
					  {
				  		if(args.debug == true) log.debug("found CarCardAmount: " + bundleInfo.CarCardAmount);

				  		var splitInfo = bundleInfo.CarCardAmount.split(",");
				  		if(splitInfo.length >= 2)
				  		{
				  			var res = GiveUserCarCard(bundleInfo.CarCard, splitInfo[0], splitInfo[1], userInventoryObject);
				  			objectsUpdated.push(res);
				  		}
				  		else
				  			return generateErrObj("Catalog data corrupt");

					  }
				  }
				  var chestModel = "DiamondChest";
				  //ChestModel
				  if(bundleInfo.ChestModel != undefined)
				  {
			  		if(args.debug == true) log.debug("found ChestModel: " + bundleInfo.ChestModel);
			  		chestModel = bundleInfo.ChestModel;
				  }
		  	}
		  }

		var suArray = [];
		var su = {StatisticName : "IAPValue", Value: iapVal};
		suArray.push(su);

		var updateRequest = server.UpdatePlayerStatistics(
		  {
		    PlayFabId: currentPlayerId,
		    Statistics: suArray
		  }
		  );
		 invData = 
		 {
		 	Inventory: objectsUpdated,
            VirtualCurrency: currencyUpdated
		 };
		 var returnObj = {
		        Result: "OK",
		        Message: "InventoryUpdate",
		        InventoryChange:invData
		      };

		return returnObj;

		break;
		default:
		if(args.debug == true) log.debug("InvalidPurchaseParameter");
		break;
	}

	var suArray = [];
	var su = {StatisticName : "IAPValue", Value: iapVal};
	suArray.push(su);

	var updateRequest = server.UpdatePlayerStatistics(
	  {
	    PlayFabId: currentPlayerId,
	    Statistics: suArray
	  }
	  );
	
	publishToLiveFeed(currentPlayerId, "boughtIAP", args.bundle);
}
