handlers.buyChest = function(args, context)
{
  var mC = CheckMaintenanceAndVersion(args);
  if(mC != "OK") return generateMaintenanceOrUpdateObj(mC);

  var userInventoryObject=server.GetUserInventory(
  {
    PlayFabId:currentPlayerId
  });

  var bO = checkBalance(args.curr, args.cost, userInventoryObject.VirtualCurrency.SC, userInventoryObject.VirtualCurrency.HC);
  if(bO != "OK") return generateFailObj("not enough money");
  if(args.cost > 0)
  {
    var subtractUserCurrencyResult = server.SubtractUserVirtualCurrency(
    {
      PlayFabId: currentPlayerId,
      VirtualCurrency : args.curr,
      Amount: args.cost
    }
    );
    updateCurrencySpentStatistic(args.curr, args.cost);
    var cU = {};
    cU[subtractUserCurrencyResult.VirtualCurrency] = subtractUserCurrencyResult.Balance;
    return generateInventoryChange("ChestBought", {VirtualCurrency: cU});
  }
  else
  {
    return generateInventoryChange("ChestBought", {});
  }
};
