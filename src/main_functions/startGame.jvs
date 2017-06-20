handlers.startGame = function(args, context) {

  var mC = CheckMaintenanceAndVersion(args);
  if(mC != "OK") return generateMaintenanceOrUpdateObj(mC);

  //trophy count and subleague distribution
  var leagueTitleDataRequest = server.GetTitleData(
    {
      Key: ["LeagueSubdivisions","SubdivisionTrophyRanges","TrophyGainRange","TrophyLoseRange","SubdivisionPrRanges", "TrophyDifferenceLimit"]
    }
    );
  //let's get the GamesStarted statistic
  var gss=server.GetPlayerStatistics(
  {
     PlayFabId: currentPlayerId,
     StatisticNames: ["TotalGames"]
  }).Statistics;
  var totalGamesStarted = GetValueFromStatistics(gss, "TotalGames", 0);
  totalGamesStarted = Number(totalGamesStarted) + 1;
  if(args.debug == true) log.debug("totalGamesStartedIs: " + totalGamesStarted);
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
  var sdval = leagueTitleDataRequest.Data["SubdivisionTrophyRanges"];
  var sdvalParsed = JSON.parse(sdval);
  var lsVal = leagueTitleDataRequest.Data["LeagueSubdivisions"];
  var lsValParsed = JSON.parse(lsVal);
  var sdprVal = leagueTitleDataRequest.Data["SubdivisionPrRanges"];
  var sdprValParsed = JSON.parse(sdprVal);

  //trophyAdjustment data
  var tdlVal = leagueTitleDataRequest.Data["TrophyDifferenceLimit"]; //u are here
  var tdlValParsed = JSON.parse(tdlVal);
  var trophyReadjustRange = Number(tdlValParsed.trophyReadjustRange);
  var trophyMaxDifference = Number(tdlValParsed.maxDifference);
  var excludedSubdivisionsFromTrophyAdjustment = tdlValParsed.subDivisionsToExclude;
  //log.debug("SubdivisionTrophyRanges " + sdvalParsed);
  var subDivision = 43;
  var nextSubDivision = 43;
  var subDivisionRange = 200;
  var rminmaxarr = leagueTitleDataRequest.Data["TrophyGainRange"].split("_");
  var lminmaxarr = leagueTitleDataRequest.Data["TrophyLoseRange"].split("_");
  var rMin = Number(rminmaxarr[0]);
  var rMax = Number(rminmaxarr[1]);
  var lMin = Number(lminmaxarr[0]);
  var lMax = Number(lminmaxarr[1]);
  for(var i = 0; i < sdvalParsed.subdivisions.length; i++)
  {
    if(trophyCount<Number(sdvalParsed.subdivisions[i]))
    {
      subDivision = i;
      if(i < sdvalParsed.subdivisions.length - 1) nextSubDivision = i + 1;
      break;
    }
  }
  subDivisionRange = Number(sdvalParsed.subdivisions[nextSubDivision]) - Number(sdvalParsed.subdivisions[subDivision]);
  if(subDivisionRange <= 0) subDivisionRange = 400; // random 400
  //log.debug("user is in subdivision " + subDivision);

  //matchmaking code
  //let's get subdivision and neighbouring subdivisions
  var subDivKeys = ["RecSubDivision"+subDivision];
  var titleData = server.GetTitleInternalData(
    {
      Keys : "RecSubDivision"+subDivision
    }
    );
  var recPool = titleData.Data["RecSubDivision"+subDivision];
  var isIncompleteSubDivision = false;
  //log.debug("recPool " + recPool);
  if(recPool == undefined) isIncompleteSubDivision = true;
  var recArray;
  var opponentId;
  var env;
  var course;

//previous opponents + win status
var oppPrev = "noop"; // ultimu
var oppPrevPrev = "noop";// penultimu
var oppArray;
var oppDat = server.GetUserInternalData(
{
    PlayFabId: currentPlayerId,
    Keys: ["lastOpp", "quitLastGame"]
});
var didQuitLastGame = "false;"
if(oppDat.Data.quitLastGame != undefined)
  didQuitLastGame = oppDat.Data.quitLastGame.Value;
//if(args.debug == true) log.debug("didQuitLastGame: " + didQuitLastGame);
var setLastGameToLossFlag = false;
if(didQuitLastGame == undefined) didQuitLastGame = "false";
if(didQuitLastGame == "true") 
{
  //user quit so we have to set his last game to a loss
  setLastGameToLossFlag = true; //urhereson
}
if((oppDat.Data == undefined) || (oppDat.Data.lastOpp == undefined))
{
  //log.debug("opp data is undefined");
  oppPrev = "noop";
  oppPrevPrev = "noop";
}
else
{
  oppArray = oppDat.Data.lastOpp.Value.split(",");
 // log.debug("oppArray is " + oppArray);
  for(var i = 0; i < oppArray.length; i++)
  {
    if(i == 0) oppPrev = oppArray[i];
    if(i == 1) oppPrevPrev = oppArray[i];
  }
 // log.debug("oppPrev is " + oppPrev);
 // log.debug("oppPrevPrev is " + oppPrevPrev);
}
  if(isIncompleteSubDivision == false)
  {
    recArray = JSON.parse(recPool);
    opponentId = recArray[recArray.length - 1].uId;
    env = recArray[recArray.length - 1].e;
    course = recArray[recArray.length - 1].c;
  }
  else
  {
    recArray = [];
  }

  //default recording code
  var subDivisionLength = 30; // we have 25 possible courses
  var envCourseArray =
  [
  0,0,0,0,0,
  0,0,0,0,0,
  0,0,0,0,0,
  0,0,0,0,0,
  0,0,0,0,0,
  0,0,0,0,0
  ]
  //log.debug("subrecording pool has " + recArray.length + " length. Must have: " + subDivisionLength + " length");

  if(recArray.length < subDivisionLength) isIncompleteSubDivision = true;

  var validRecArray = new Array(recArray.length); // all recordings except yours
  var vrAidx = 0;
  var likelyRecArray = new Array(recArray.length); // all recordings minus yours AND minus oppPrev
  var lrAidx = 0;
  var moreLikelyRecArray = new Array(recArray.length); // all recordings minus yours AND minus oppPrev AND minus oppPrevPrev
  var mlrAidx = 0;
  //log.debug("iterating through recArray");
  for(var i = 0; i < recArray.length; i++) // create valid rec pool OR check for missing env/course if subDivision has missing recordings
  {
      if(isIncompleteSubDivision == true)
      {
        envCourseArray[Number(recArray[i].e)*5 + Number(recArray[i].c)] = 1;
      }
      if(recArray[i].uId == currentPlayerId)
        {
         // log.debug("found: " + recArray[i].uId + "... skipping");
          continue;
        }
        validRecArray[vrAidx] = recArray[i];
        vrAidx++;
      if(recArray[i].uId == oppPrev)
        {
         // log.debug("found: " + recArray[i].uId + "... skipping prev opp");
          continue;
        }
        likelyRecArray[lrAidx] = recArray[i];
        lrAidx++;
      if(recArray[i].uId == oppPrevPrev)
        {
         // log.debug("found: " + recArray[i].uId + "... skipping prev prev opp");
          continue;
        }
        moreLikelyRecArray[mlrAidx] = recArray[i];
        mlrAidx++;
  }
//log.debug("isIncompleteSubDivision: " + isIncompleteSubDivision);
//let's give default recording if necessary
if(isIncompleteSubDivision == true)
{
  var envToGet = 0;
  var courseToGet = 0;
  var recordlessTracks = [];

  for(var i = 0; i < envCourseArray.length; i++)
  {
    if(envCourseArray[i] == 0)// we found a missing recording <- e = i/5; c = i%5;
    {
      recordlessTracks.push(i);
    }
  }

  var courseIndexMissing = recordlessTracks[Math.floor(Math.random() * recordlessTracks.length)];
      envToGet = Math.floor(courseIndexMissing/5);
      courseToGet = courseIndexMissing%5;

  //log.debug("gettingDefaultUser: env: " + envToGet + " course: " + courseToGet);
  //let's see who the master account is
    var masterAccountRequest = server.GetTitleData(
    {
      Keys : "MasterUser"
    }
    );
    if(masterAccountRequest.Data["MasterUser"] != undefined)
    {
     // log.debug("master user: " + masterAccountRequest.Data["MasterUser"]);
      var defaultRecordingData = server.GetUserReadOnlyData(
      {
        PlayFabId: masterAccountRequest.Data["MasterUser"],
        Keys: [(envToGet + "_" + courseToGet + "_RecPos") , (envToGet + "_" + courseToGet + "_RecRot"), (envToGet + "_" + courseToGet + "_RecHeader")]
      }
      );
      if(defaultRecordingData.Data != undefined)
      {
        //log.debug("defaultRecordingData: " + defaultRecordingData.Data);
        if((defaultRecordingData.Data[envToGet + "_" + courseToGet + "_RecPos"] != undefined) && (defaultRecordingData.Data[envToGet + "_" + courseToGet + "_RecRot"] != undefined) && (defaultRecordingData.Data[envToGet + "_" + courseToGet + "_RecHeader"] != undefined))
        { // looks like we found a valid default recording
          var updateTrophyInternal = true;
          if(trophyCount == 0)
          {
            //this is the tutorial condition
            //let's give your player a chest. THIS ONLY HAPPENS ONCE
            grantUserChest(currentPlayerId, "tutorial");
            trophyCount = rMax;
            updateTrophyInternal = false;
          }
          else
          {
            trophyCount -= lMin;
          }
          if(trophyCount <= 1) trophyCount = 1;
          //wlStatInt = parseInt(wlStat, 2);

          //log.debug("updating WL to:  " + wlStatInt);
          //update stats on server
          var suArray = [];
          //var su = {StatisticName: "WinLoss", Version : "0", Value: wlStatInt};
          //suArray.push(su);
          var sut = {StatisticName: "TrophyCount", Value: trophyCount};
          suArray.push(sut);
          var sul = {StatisticName: "League", Value: cLeague};
          suArray.push(sul);
          var sul = {StatisticName: "TotalGames", Value: totalGamesStarted};
          suArray.push(sul);
          //log.debug("updatingStats: " + suArray);
          var updateRequest = server.UpdatePlayerStatistics(
          {
            PlayFabId: currentPlayerId,
            Statistics: suArray
          }
          );

          var trophiesOnWin = Math.floor((Number(rMax) + Number(rMin))/2);
          var trophiesOnLose = Math.floor((Number(lMax) + Number(lMin))/2);

          var dataToUpdate = {
            "trophyWin" : trophiesOnWin,
            "trophyLose": trophiesOnLose,
            "quitLastGame" : "true",
          }

          if(updateTrophyInternal == false)
          {
            dataToUpdate["trophyWin"] = 0;
            dataToUpdate["trophyLose"] = 0;
          }
          if(setLastGameToLossFlag == true)//urhere
          {
            dataToUpdate["LastGameOutcome"] = "Loss";
          }
          server.UpdateUserInternalData(
          {
            PlayFabId: currentPlayerId,
            Data: dataToUpdate
          });
          //log.debug("found valid default rec");
          return {
            Result :"OK",
            RecType: "TheStig",
            PosData: defaultRecordingData.Data[envToGet + "_" + courseToGet + "_RecPos"].Value, //0_0_RecPos
            RotData: defaultRecordingData.Data[envToGet + "_" + courseToGet + "_RecRot"].Value,
            HeaderData: defaultRecordingData.Data[envToGet + "_" + courseToGet + "_RecHeader"].Value,
            TrophyLose: lMin,
            TrophyWin : rMax,
            Opp: "TheStig",
            PicTexture : null
                 };
        }
      }
    }
}
//log.debug("looking for user generated recording");
if(vrAidx == 0) return generateErrObj("no valid recording found for this subdivision");

//we have 3 arrays. We want the likelyhood that you get the same previous opponents to be as low as possible
//so we will see if moreLikelyRecArray is empty. If yes we check if likelyRecArray is empty.
//if they are both empty we remain with the current validRecArray array
var searchArray = validRecArray;
var sAlen = vrAidx;
  if(lrAidx > 0){sAlen = lrAidx; searchArray = likelyRecArray}
  if(mlrAidx > 0){sAlen = mlrAidx; searchArray = moreLikelyRecArray}
  var pivot = Math.floor(Math.random() * sAlen);
  if(pivot >= sAlen) pivot = sAlen - 1; //i'm not fully sure Math.random can't give a value of 1 DON'T JUDGE ME
//legacy WINLOSS RATIO mathcmaking
  //var pivot = sAlen - 1; //in case your WLRatio is the highest in the pool
  //for(var i = 0; i < sAlen; i++) // write winstreak/losestreak code
  //{
  //  if(searchArray[i].wl > winRatio) //let's find the pivot; we'll move it later based on WL ratio
  //  {
  //    pivot = i;
  //    break;
   // }
  //}
 // log.debug("pivot is: " + pivot);
  var finalRecArraySize = Math.min(sAlen, 3); // for now 3 is the max number of recordings in the random final pool
 // log.debug("finalRecArraySize: " + finalRecArraySize);
  var finalRecArray = new Array(finalRecArraySize); // this array will be populated with the recordings around the pivot
  for(var i = 0; i < finalRecArraySize; i++)
  {
    if(pivot <= 0) // get rightmost recordings
    {
      finalRecArray[i] = searchArray[i];
      continue;
    }
    if(pivot >= sAlen - 1) // get leftmost recordings
    {
      finalRecArray[i] = searchArray[sAlen - 1 - i];
      continue;
    }
    finalRecArray[i] = searchArray[(pivot - Math.floor(finalRecArraySize/2) + i)]; // get inner recordings
  }
  var randIdx = Math.floor(Math.random() * finalRecArraySize); // let's get a random one from this final pool
    opponentId = finalRecArray[randIdx].uId;
    env = finalRecArray[randIdx].e;
    course = finalRecArray[randIdx].c;
  var urodkr = [(env + "_" + course + "_RecPos") , (env + "_" + course + "_RecRot"), (env + "_" + course + "_RecHeader")];
 // log.debug("requesting " + urodkr);
  var recordingData = server.GetUserReadOnlyData(
    {
      PlayFabId: opponentId,
      Keys: urodkr
    }
    );
  if(recordingData == undefined) return generateErrObj("Did not find recording for this user: " + opponentId); // handle this later
  //end matchmaking

  var oI = server.GetPlayerCombinedInfo(
    {
      PlayFabId:opponentId,
      InfoRequestParameters: {"GetUserAccountInfo": true,"GetUserInventory": false,"GetUserVirtualCurrency": false,"GetUserData": false,"GetUserReadOnlyData": false,"GetCharacterInventories": false,"GetCharacterList": false, "GetTitleData": false,"GetPlayerStatistics": false}
    }
    );

  var oppTexture = server.GetUserData(
  {
    PlayFabId:opponentId,
    Keys : ["PicTexture"]
  }).Data.PicTexture;
  if(oppTexture == undefined) oppTexture = null;
  else oppTexture = oppTexture.Value;
  //found recording now let's reduce user's trophies
          //let's extract opponent trophies so we know how muany trophies we give/takeaway from user
          var trophiesToTake = 15; // min
          var trophiesToGive = 30; // max
          var userTrophies = trophyCount;
          var oppTrophies;
          var cLeague = Number(calculateLeague(trophyCount));
          var recTypeSent = "UserGenerated";
//log.debug("cLeague " + cLeague);
  //        log.debug("lsValParsed: " + lsValParsed);
  //        log.debug("sdvalParsed: " + sdvalParsed);
  //        log.debug("lsValParsed.leagues: " + lsValParsed.leagues);
  //        log.debug("sdvalParsed.subDivisions: " + sdvalParsed.subdivisions);

          var minLeagueT
          if(cLeague > 0)
            minLeagueT = Number(sdvalParsed.subdivisions[lsValParsed.leagues[cLeague - 1]]);
          else
            minLeagueT = 0;

          var maxLeagueT;
          if(cLeague >= lsValParsed.leagues.length - 1)
            maxLeagueT = minLeagueT * 2;
          else
            maxLeagueT = Number(sdvalParsed.subdivisions[lsValParsed.leagues[cLeague]]);

//log.debug("maxLT " + maxLeagueT + " minLeagueT " + minLeagueT);
          if(args.debug == true) log.debug("I bet it will crash after this");
          var opponentHeader = JSON.parse(recordingData.Data[env + "_" + course + "_RecHeader"].Value);
          if(args.debug == true) log.debug("or not");
          if(opponentHeader != undefined)
          {
            oppTrophies = opponentHeader.Trophies;
          }
          oppTrophies = Number(oppTrophies);
          var trophyAdjustmentRequired = true;
          //let's adjust said trophies if needed and modify the header
          if(args.debug == true) log.debug("Adjusting trophies");

          if(excludedSubdivisionsFromTrophyAdjustment != undefined) 
          {
            if(args.debug == true) log.debug("excludedSubdivisionsFromTrophyAdjustment: " + excludedSubdivisionsFromTrophyAdjustment);
            for(var i = 0; i < excludedSubdivisionsFromTrophyAdjustment.length; i++)
            {
              if(subDivision == Number(excludedSubdivisionsFromTrophyAdjustment[i])) 
                {
                  if(args.debug == true) log.debug("in excluded subdivision: " + subDivision);
                  trophyAdjustmentRequired = false;
                  break;
                }
            }
          }
          if(trophyAdjustmentRequired == true)
          {
            if(Number(Math.abs(userTrophies - oppTrophies)) >= trophyMaxDifference)
            {
              if(args.debug == true) log.debug("generating new trophies. Reason: user trophies: " + userTrophies + " vs opponent trophies: " + oppTrophies);
              oppTrophies = userTrophies - trophyReadjustRange + Math.floor(Math.random() * trophyReadjustRange * 2);
              opponentHeader.Trophies = oppTrophies;
              if(args.debug == true) log.debug("performing stringify on recordingData header");
              recordingData.Data[env + "_" + course + "_RecHeader"].Value = JSON.stringify(opponentHeader); //hope this works

            }
          }
          //end trophy adjustments

          if(maxLeagueT - minLeagueT <= 0)
          {
              trophiesToTake = lMax;
              trophiesToGive = rMin;
          }
          else
          {
            if(Number(Math.abs(userTrophies - oppTrophies)) > Number(subDivisionRange))
            {
              trophiesToTake = Math.floor((lMin + lMax)/2) - 1 + Math.floor(Math.random() * 3);
              trophiesToGive = Math.floor((rMax + rMin)/2) - 1 + Math.floor(Math.random() * 3);
              //recTypeSent = "MobyDick"; // the difference in trophies is too damn high. Tell the client to generate a more appropriate opponent
            }
            else
            {
            //  log.debug("rMin: " + rMin + " userTrophies: " + userTrophies + " oppTrophies " + oppTrophies + " maxLeagueT " + maxLeagueT + " minLeagueT " + minLeagueT + " rMax: " + rMax);
              trophiesToTake = lMin + Math.floor((((userTrophies - oppTrophies)/(maxLeagueT - minLeagueT)) + 1) * ((lMax - lMin)/2));
              trophiesToGive = rMin + Math.floor((((oppTrophies - userTrophies)/(maxLeagueT - minLeagueT)) + 1) * ((rMax - rMin)/2));
            }
          }
          //let's also check if the opponent's Pr is in the appropriate range
          if(args.debug == true) log.debug("Opponent's PR is TOO DAMN HIGH! " + opponentHeader.Pr + " vs " + Number(sdprValParsed.subdivisions[Number(lsValParsed.leagues[cLeague - 1]) + 1]) + ". You are in subdivision: " + Number((lsValParsed.leagues[cLeague - 1]) + 1));
          if(opponentHeader.Pr > Number(sdprValParsed.subdivisions[Number(lsValParsed.leagues[cLeague - 1]) + 1]))
          {
            //log.debug("Opponent's PR is TOO DAMN HIGH! " + opponentHeader.Pr + " vs " + Number(sdprValParsed.subdivisions[lsValParsed.leagues[cLeague - 1] + 1]) + ". You are in subdivision: " + lsValParsed.leagues[cLeague - 1] + 1);
            trophiesToTake = Math.floor((lMin + lMax)/2) - 1 + Math.floor(Math.random() * 3);
            trophiesToGive = Math.floor((rMax + rMin)/2) - 1 + Math.floor(Math.random() * 3);
            recTypeSent = "MobyDick"; // the difference in Pr is too damn high. Tell the client to generate a more appropriate opponent
          }
  var updateTrophiesToGiveTake = true;
  if(trophyCount == 0)
  {
    //this is the tutorialCondition
    //let's give your player a chest. THIS ONLY HAPPENS ONCE
    grantUserChest(currentPlayerId, "tutorial");
    updateTrophiesToGiveTake = false;
    trophyCount = rMax;
  }
  else
  {
    trophyCount -= Number(trophiesToTake);
    if(trophyCount <= 1) trophyCount = 1;
  }
  //log.debug("trophiesToTake:  " + trophiesToTake);
 // log.debug("trophiesToGive:  " + trophiesToGive);
  //wlStatInt = parseInt(wlStat, 2);
 // log.debug("updating WL to:  " + wlStatInt);
  //update stats on server
  var suArray = [];
  //var su = {StatisticName: "WinLoss", Version : "0", Value: wlStatInt};
  //suArray.push(su);
  var sut = {StatisticName: "TrophyCount", Value: trophyCount};
  suArray.push(sut);
  var sul = {StatisticName: "League", Value: cLeague};
  suArray.push(sul);
  var sul = {StatisticName: "TotalGames", Value: totalGamesStarted};
  suArray.push(sul);
 // log.debug("updatingStats: " + suArray);
  var updateRequest = server.UpdatePlayerStatistics(
  {
    PlayFabId: currentPlayerId,
    Statistics: suArray
  }
  );
  var lastOppVal = opponentId + "," + oppPrev;
            var dataToUpdate = {
            "trophyWin" : trophiesToGive,
            "trophyLose": trophiesToTake,
            "lastOpp" : lastOppVal,
            "quitLastGame" : "true",
          }
  if(updateTrophiesToGiveTake == false)
  {
          dataToUpdate["trophyWin"] = 0;
          dataToUpdate["trophyLose"] = 0;
  }
  if(setLastGameToLossFlag == true)//urhere
      {
          dataToUpdate["LastGameOutcome"] = "Loss";
      }
          server.UpdateUserInternalData(
          {
            PlayFabId: currentPlayerId,
            Data: dataToUpdate
          });


  return {
    Result :"OK",
    RecType: recTypeSent,
    PosData: recordingData.Data[env + "_" + course + "_RecPos"].Value, //0_0_RecPos
    RotData: recordingData.Data[env + "_" + course + "_RecRot"].Value,
    HeaderData: recordingData.Data[env + "_" + course + "_RecHeader"].Value,
    TrophyLose: trophiesToTake,
    TrophyWin : trophiesToGive,
    Opp: oI.InfoResultPayload.AccountInfo.TitleInfo.DisplayName,
    PicTexture : oppTexture
         };
}
