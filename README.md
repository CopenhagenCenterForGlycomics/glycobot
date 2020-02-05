
As the user that owns the developer account:

```
twurl -X POST '/1.1/account_activity/all/prod/webhooks.json?url=$APIURL/twitter'
```

You'll get a webhook ID as a result of this. If you want to get the webhook ID again, do:

```
twurl '/1.1/account_activity/all/webhooks.json'
```

If, for whatever reason you need to re-validated the webhook you do

```
twurl '/1.1/account_activity/all/prod/webhooks/$WEBHOOKID.json'
```


To subscribe the user that is being the bot (assuming a twitter environment called prod):

```
twurl -X POST '/1.1/account_activity/all/prod/subscriptions.json'
```



