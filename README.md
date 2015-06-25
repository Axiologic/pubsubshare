# PubSubChor 
Pub Sub server for implementing  executable choreographies (for SwarmESB or other projects). PubSubChor creates a network of nodes that can securely relay messages between organisations

##Ideea
Each organisation will start one or more relays. Internal organisation nodes will use those relays as normal sub channels. 
Subscribe (sub) operations to an relay are allowed only for internal nodes. Normally, internal nodes stays behind a firewall (and NAT) and will get access only from a PubSubChor relay.   
 
##Features
  PubSubChor allows controlled and secure 
        - message communication between internal nodes from any two organisations
        - file transfers between nodes belonging to any two organisations.  
        - code signing service: at signing a list of organisations is specified and the code should be approved by a fixed number of organisations
 
 
##Main Concepts

  Relay: a node in internet that can pair with other relays servers belonging to other organisations. Relay servers can pass messages between them.
  
  Internal node: pub/sub clients of a relay 
      
  Node addresses: 
     The system allow publish (pub) operations to go over organisation boundaries. Each internal node has an address in the form "organisationName/nodeName"
  
  Organisation name: usually the main web address (eg site.com) will be used.
  
  Code signing: Any administrator of an relay can request a signature for a package (containing a number of files). At request a number of organisation can be specified that have to approve and sign that package. 
    The system administrators appointed by an organisation can review requests and manually accept and sign a package. The whole system will be informed by the signing approval. 

   Pair key: There is no central authority and any pair of relays have to agree on a symmetrical encryption key that will be used to exchange messages. 
   For security reasons, this key is automatically changed after a number of messages.
   The initial pairing is manually added by the software administrators belonging to each organisation. 

   Relay public key: each relay have an public and a private key that is used to sign packages.

##Implementation details
  PubSubChor use a Redis server for message persistence, for keeping configurations and keys and for providing internal PubSub services. 
  Each internal node is connected to redis and subscribed to one channel (a channel with his name). When requests to send messages outside are detected,an internal node sends the message to the chanel RELAY.
  The Redis server should not be visible outside of the internal network and even its visibility inside of the internal network should be restricted.


## TODO
    PubSubChor is work in progress, no stable version is ready yet. 
    
## Messages :
  All the messages are JSONS in this format:
    
         {
            TYPE:string,              /* message type*/
            FROM:string,
            TO:string,
            version:string,           /* current protocol version*/
            pversion:number,          /*password version*/      
            messageCounter:int        /* each message has a counter to prevent forgery. A rely can't sent twice a message with the same messageCounter or with a counter smaller than previous one */
            payload:object            /* could be an int a string or an encrypted content*/
            randomPadding:string      /* a string with random data to obfuscate the type of message based on length*/
         }

    MESSAGES SEND 
    
    PING, PONG:  
        the PING message will contain a field payload with a random string generated as password and encrypted with current password 
        PONG:  will contain no content, only the current version of the password. PONG will be send after each other message with payload beeing the acknowledged message number
    RELAY:  forward a message toward another organisation
    CP: change password 
     
     
    
    

