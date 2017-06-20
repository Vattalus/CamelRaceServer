handlers.worthlessScript = function(args, context)
{
	//get norbi's picture 
	  var oppTexture = server.GetUserData(
	  {
	    PlayFabId:"B730B2C5BD143660",
	    Keys : ["PicTexture"]
	  }).Data.PicTexture.Value;


	  	//get all players in RecSubdivision1
		var td = server.GetTitleInternalData(
		{
			Keys : ["RecSubDivision1"]
		});
		var recPool = td.Data["RecSubDivision1"];
		log.debug("recPool: " + recPool);
		var recArray = JSON.parse(recPool);
		for(var i = 0; i < recArray.length; i++)
		{
				  //set face to norbi
		  var setFace = server.UpdateUserData(
		  {
		  	PlayFabId: recArray[i].uId,
		  	Data : {"PicTexture" : oppTexture },
		  	Permission: "Public"
		  });
		}
}
