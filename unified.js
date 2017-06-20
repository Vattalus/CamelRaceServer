handlers.grantOasis = function (args, context) {
    var message = "this is just a test";

    log.info(message);
    var inputValue = null;
    if (args && args.inputValue)
        inputValue = args.inputValue;
    log.debug("helloWorld:", { input: args.inputValue });

    return { messageValue: message };
}