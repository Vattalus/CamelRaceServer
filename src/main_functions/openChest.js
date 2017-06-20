handlers.openChest = function(args, context)
{
  var mC = CheckMaintenanceAndVersion(args);
  if(mC != "OK") return generateMaintenanceOrUpdateObj(mC);

  var objectsUpdated = [];
  var currencyUpdated = [];
  var invChangeObj;
  var userInventoryObject = server.GetUserInventory(
    {
      PlayFabId: currentPlayerId
    }
  );

  //currency
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

  var outInventory = server.GetUserInventory({PlayFabId: currentPlayerId});

  return generateInventoryChange("InventoryUpdated", outInventory);
};
