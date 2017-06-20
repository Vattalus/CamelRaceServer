handlers.retrieveBlackMarket = function(args, context)
{
	var mC = CheckMaintenanceAndVersion(args);
	if(args.reset === true)
	{ 		
  		if(mC != "OK") return generateMaintenanceOrUpdateObj(mC);
	}

  //let's get last BM Time Call
  var keysToGet = [];
  keysToGet.push("BMTime");
  for(var i = 0; i < 4; i++)
  {
    keysToGet.push("BMItem" + i);
  }

  var getInternalDataResult = server.GetUserInternalData(
    {
      PlayFabId: currentPlayerId,
      Keys: keysToGet
    }
    );

  if(getInternalDataResult.Data.BMTime === undefined)
  {
    //log.debug("No user BM data detected; generating ...");
    return GenerateBlackMarket(currentPlayerId);
  }

  var d = new Date();
  //log.debug("milliseconds passed: " +  d.getTime());
  //log.debug("BMTime: " +  getInternalDataResult.Data.BMTime.Value);

  var tK = [];
  tK.push("BlackMarketResetMinutes");
  var tData = server.GetTitleData(
    {
      PlayFabId : currentPlayerId,
      Keys : tK
    }
    );
  if(args.reset === true)
  {
    //log.debug("reseting market");
    var curr = "HC";
    var cost = 200;
    var td = server.GetTitleData(
    {
      Keys : ["BlackMarketResetCost"]
    });
    if(td.Data["BlackMarketResetCost"] !== undefined)
    {
      var tDatArr = td.Data["BlackMarketResetCost"].split("_");
      curr = tDatArr[0];
      cost = Number(tDatArr[1]);
    }

    if(cost > 0)
    {
      var userInventoryObject = server.GetUserInventory(
      {
        PlayFabId: currentPlayerId
      }
      );

      var bO = checkBalance(curr, cost, userInventoryObject.VirtualCurrency.SC, userInventoryObject.VirtualCurrency.HC);
      if(bO != "OK") return generateFailObj("not enough money");

      var subtractUserCurrencyResult = server.SubtractUserVirtualCurrency(
        {
          PlayFabId: currentPlayerId,
          VirtualCurrency : curr,
          Amount: cost
        }
        );
      updateCurrencySpentStatistic(curr, cost);
      var marketObject = GenerateBlackMarket(currentPlayerId);
      ////////////////
      var currencyUpdated = {};
      currencyUpdated[subtractUserCurrencyResult.VirtualCurrency] = subtractUserCurrencyResult.Balance;
      i =
         {
           VirtualCurrency: currencyUpdated
         };
      marketObject["InventoryChange"] = i;
      return marketObject;
      ////////////////
    }
    return GenerateBlackMarket(currentPlayerId);
  }

  if(d.getTime() - parseInt(getInternalDataResult.Data.BMTime.Value) > parseInt(tData.Data.BlackMarketResetMinutes) *60*1000) // minutes *60*1000
  {
    //log.debug("regenerating market");
    if(mC != "OK") GetCurrentBlackMarket(currentPlayerId, getInternalDataResult);
    return GenerateBlackMarket(currentPlayerId);
  }
  //log.debug("get current market");
  return GetCurrentBlackMarket(currentPlayerId, getInternalDataResult);
};
