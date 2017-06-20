handlers.initServerData = function(args)
{
//create trophy statistic
var suArray = [];

var su = {StatisticName : "TrophyCount", Version : "0", Value: "0"};
suArray.push(su);
su = {StatisticName : "League", Version : "0", Value: "0"};
suArray.push(su);

var updateRequest = server.UpdatePlayerStatistics(
{
  PlayFabId: currentPlayerId,
  Statistics: suArray
}
);
var itemsToGive = ["Decals","PaintJobs", "Plates", "Rims", "WindshieldText"];
//itemsToGive.push("Decals");
//itemsToGive.push("PaintJobs");
//itemsToGive.push("Plates");
//itemsToGive.push("Rims");
//itemsToGive.push("WindshieldText");

var grantRequest = server.GrantItemsToUser(
  {
    CatalogVersion : "Customization",
    PlayFabId: currentPlayerId,
    ItemIds : itemsToGive
  }
  );

var InvData = {"0" : "Owned"};

for(var i = 0; i < grantRequest.ItemGrantResults.length; i++)
{
  server.UpdateUserInventoryItemCustomData(
       {
         PlayFabId: currentPlayerId,
         ItemInstanceId: grantRequest.ItemGrantResults[i].ItemInstanceId,
         Data: InvData
       }
       );
}
var carsToGive = [];
carsToGive.push("FordFocus");
var carRequest = server.GrantItemsToUser(
{
  CatalogVersion : "CarsProgress",
  PlayFabId: currentPlayerId,
  ItemIds : carsToGive
}
);
var CarData = {"CarLvl" : "1","EngineLvl" : "0","ExhaustLvl" : "0","GearboxLvl" : "0","SuspensionLvl" : "0"};
server.UpdateUserInventoryItemCustomData(
{
  PlayFabId: currentPlayerId,
  ItemInstanceId: carRequest.ItemGrantResults[0].ItemInstanceId,
  Data: CarData
}
);
CarData = {"TiresLvl" : "0","TurboLvl" : "0","PaintId" : "0","DecalId" : "0","RimsId" : "0"};
server.UpdateUserInventoryItemCustomData(
{
  PlayFabId: currentPlayerId,
  ItemInstanceId: carRequest.ItemGrantResults[0].ItemInstanceId,
  Data: CarData
}
);
CarData = {"PlatesId" : "0","WindshieldId" : "0","Pr" : "10"};
server.UpdateUserInventoryItemCustomData(
{
  PlayFabId: currentPlayerId,
  ItemInstanceId: carRequest.ItemGrantResults[0].ItemInstanceId,
  Data: CarData
}
);

var partsToGive = [];
partsToGive.push("Engine");
var partRequest = server.GrantItemsToUser(
{
  CatalogVersion : "PartCards",
  PlayFabId: currentPlayerId,
  ItemIds : partsToGive
}
);
var PartData = {"Amount" : "5"};
server.UpdateUserInventoryItemCustomData(
{
  PlayFabId: currentPlayerId,
  ItemInstanceId: partRequest.ItemGrantResults[0].ItemInstanceId,
  Data: PartData
}
);
CarData = {"CarLvl" : "1","EngineLvl" : "0","ExhaustLvl" : "0","GearboxLvl" : "0","SuspensionLvl" : "0"};
server.UpdateUserInventoryItemCustomData(
{
  PlayFabId: currentPlayerId,
  ItemInstanceId: carRequest.ItemGrantResults[0].ItemInstanceId,
  Data: CarData
});
};
