handlers.setMainCar = function(args, context)
{
	  var mC = CheckMaintenanceAndVersion(args);
  	if(mC != "OK") return generateMaintenanceOrUpdateObj(mC);

  	var userInventoryObject = server.GetUserInventory(
    {
      PlayFabId: currentPlayerId
    }
  	);
  	var mainCarInfo = {};
 	for(var i = 0; i < userInventoryObject.Inventory.length; i++)
 	{
  		if((userInventoryObject.Inventory[i].ItemId == args.carId) && (userInventoryObject.Inventory[i].CatalogVersion == "CarsProgress"))
  		{
  			mainCarInfo["carId"] = userInventoryObject.Inventory[i].ItemId;
  			mainCarInfo["carData"] = userInventoryObject.Inventory[i].CustomData;
  			updateUserProfileInfo(currentPlayerId, mainCarInfo);
  			break;
  		}
    }
}

function updateProfileCar(args, context, userId)
{

    var userPorfileObject = server.GetUserReadOnlyData(
      {
        PlayFabId: userId,
        Keys: ["UserProfileInfo"]
      }
      );
    if(userPorfileObject.Data == undefined) return;
    if(userPorfileObject.Data.UserProfileInfo == undefined) return;
    if(userPorfileObject.Data.UserProfileInfo.Value == undefined) return;
    var upObj = JSON.parse(userPorfileObject.Data.UserProfileInfo.Value);
    if(upObj.CarData.carId == args.carId)
      handlers.setMainCar(args,context);
}