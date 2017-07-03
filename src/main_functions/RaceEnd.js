handlers.raceEnd = function (args, context) {

    log.debug("argument: ", args.endRaceReward);
    log.debug("argument number: ", Number(args.endRaceReward));


    if (args != null && args.endRaceReward && Number(args.endRaceReward)) {
        addCurrency("SC", Number(args.endRaceReward));
    }

    return { Result: "OK" };
}
