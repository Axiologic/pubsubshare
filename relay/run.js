/*

var persistenceModule = require("apersistence");

require('./NameService.js');
require('./DESpair.js');
require('./relay.js');

container.service('redisPersistence', ['redisConnection'], function(outOfService, redisConnection){
    if(!outOfService){
        return null;
    } else {
        return persistenceModule.createRedisPersistence(redisConnection);
    }
})


container.service('mainFunction', ['relayService'], function(outOfService, relayService){
    if(!outOfService){
        relayService.stop();
        return null;
    } else {
        relayService.start();
        return {"relayService":relayService};
    }
})
 */