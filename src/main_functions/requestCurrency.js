handlers.requestCurrency = function(args)
{
  var mC = CheckMaintenanceAndVersion(args);
  if(mC != "OK") return generateMaintenanceOrUpdateObj(mC);
  var userInventoryObject = server.GetUserInventory(
  {
    PlayFabId: currentPlayerId,
  }
  );
  var r =
  {
    VirtualCurrency: userInventoryObject.VirtualCurrency
  };
  return r;
};
