## block-rm.sh

#!/bin/sh

read payload
cmd=$(echo "$payload" | jq -r .command)

if echo "$cmd" | grep -Eq "rm -rf[[:space:]]*/"; then
  jq -n --arg msg "Blocked rm -rf" \
    '{continue:false, permission:"deny", userMessage:$msg}'
elif echo "$cmd" | grep -Eq "Remove-Item[[:space:]]*\.\./"; then
  jq -n --arg msg "Blocked Remove-Item ../" \
    '{continue:false, permission:"deny", userMessage:$msg}'
elif echo "$cmd" | grep -Eq "del[[:space:]]*\.\./"; then
  jq -n --arg msg "Blocked del ../" \
    '{continue:false, permission:"deny", userMessage:$msg}'
else
  jq -n '{continue:true, permission:"allow"}'
fi