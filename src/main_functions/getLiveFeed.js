handlers.getLiveFeed = function(args, context)
{
	var mC = CheckMaintenanceAndVersion(args);
  	if(mC != "OK") return generateMaintenanceOrUpdateObj(mC);

  	//give live feed as object
  	var titleData = server.GetTitleInternalData(
    {
      Keys : "LiveFeed"
    }
    );
    if(titleData == undefined) return generateErrObj("No LivefeedFound");
    if(titleData.Data["LiveFeed"] == undefined) return generateErrObj("No LivefeedFound");
    var parsedData = JSON.parse(titleData.Data["LiveFeed"]);
      var r = 
      {
    	Result :"OK",
    	Feed:parsedData
      }
      return r;
}
