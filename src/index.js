const ts = require('tinyspeck'),
    onboarding = require('./onboarding.json'),
    { PORT, TOKEN } = process.env,
    users = {},
    sample = require('./schedule.json');
 var fs = require('fs');
/*State meaning:
 * 0 - NO interactions yet. Idle state
 * 1 - 
 *
 *
 * 
 */

// setting defaults for all Slack API calls
let slack = ts.instance({ token: TOKEN });
let state = 0;
// build the user's current onboarding message
function getStatusMessage(user) {
  return Object.assign({ channel: user }, onboarding.welcome);
}

// watch for onboarding slash commands
slack.on('/onboarding', payload => {
    //console.log("Onboarding!\n");

    let { user_id, response_url } = payload;
    //console.log(typeof user_id);
    //console.log(user_id);
  let message = getStatusMessage(user_id);
  let responsetype = "in_channel";
  // send current onboarding status privately
    slack.send(response_url,{ response_type: responsetype }, message);
    //console.log("changed code!\n");
});

slack.on

slack.on('app_mention', payload => {
   // console.log("I was mentioned in a channel");
    //console.log(payload);
    let { event } = payload;
    let { user, channel, text } = event;
   // console.log("I was mentioned by " + user + " in channel " + channel);
    //let message = respondToUser(user, channel, text);
    var words = text.split(" ");
    if (words.length <= 2) {
        /*
        var text_message = "Hi! <@" + user + ">, Would you like to book the conference room?";
        let placeholder = Object.assign({ type: "plain_text", text: "Select a date", emoji: true });
        //console.log(placeholder);
        let accessory = Object.assign({ type: "datepicker", initial_date: "2019-06-08", placeholder });
        var text_details = {  };
        var blocks_details = { type: "section", text: text_details, accessory };
        */
        let message = {
            attachments: [{
                blocks: [{
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "Hi! <@"+user+">, Would you like to book the conference room?"
                    },
                    accessory: {
                        type: "datepicker",
                        initial_date: "2019-06-08",
                        placeholder: {
                            type: "plain_text",
                            text: "Select a date",
                            emoji: true
                        }
                    }
                }]
            }]
        }
        slack.send({ channel: channel }, message);
        //console.log(blocks);
        //var attachments = Object.assign([blocks]);
        // var message = Object.assign({ channel: channel ,  link_names: "true" , block});
    }
    //let responsetype = "in_channel";
    //let message = { channel: channel, link_names: "true", text:"HI" }
    // send current onboarding status privately
    //console.log({ channel: channel, link_names: "true", text });
    //slack.send({ channel: channel, link_names: "true", text });
    //console.log(sample);
    //slack.send(sample.welcome, {text: "HI"});
    
    //console.log("changed code!\n");
});

slack.on("block_actions", payload => {
    console.log(payload);
    //console.log("Sending message!");
   // console.log(payload.actions.length);
    payload.actions.forEach(action => {
        if (action.type === "datepicker") {
            //console.log(action.selected_date);
            
            if (sample.welcome.conference_schedule.find(element => {return element.date === action.selected_date }) === undefined) {
                let message = {
                    attachments: [{
                        blocks: [
                            {
                                type: "section",
                                text: {
                                    type: "mrkdwn",
                                    text: "No bookings on *" + action.selected_date + "*"
                                }
                            },
                            {
                                type: "divider"
                            }
                        ]
                    }]
                }

                slack.send({ channel: payload.channel.id }, message);
            }
            let used_timeslots = [];
            sample.welcome.conference_schedule.forEach(day => {
                if (day.date === action.selected_date) {
                    //console.log(day.bookings);
                    
                    //var fields_data = new dict();
                    let blocks_data = [];
                    field_data = {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: "Schedule for the day of *" + day.date + "*"
                            }
                    }
                    blocks_data.push(field_data);
                    field_data = {
                        type: "divider"
                    }
                    
                    blocks_data.push(field_data);
                    day.bookings.forEach(booking => {
                        //let field_data = new dict();
                        field_data = {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: "<@" + booking.user_id + "> has booked from *" + booking.start_time + "* to *" + booking.end_time+"*"
                            }
                        }
                        blocks_data.push(field_data);
                        used_timeslots.push(...booking.timeslots);
                        //fields.push(field_data);
                    });
                    //console.log("USED time slots:");
                    //console.log(used_timeslots);
                    if (day.bookings.length === 0) {
                        let message = {
                            attachments: [{
                                blocks: [
                                    {
                                        type: "section",
                                        text: {
                                            type: "mrkdwn",
                                            text: "No bookings on *" + day.date + "*"
                                        }
                                    },
                                    {
                                        type: "divider"
                                    }]
                            }]
                        }

                        slack.send({ channel: payload.channel.id }, message);
                    }
                    // console.log(blocks_data)
                    else {
                        //time_options
                        start_time = 24;
                        current_time = 24;
                        let options_list = [];
                        while (current_time < 72) {
                            if (used_timeslots.includes(current_time.toString())) {
                                //console.log(current_time + " exists in the timeslots");
                                current_time = current_time + 1;
                                continue;
                            }
                            time_options = {
                                text: {
                                    type: "plain_text",
                                    text: (Math.floor(current_time / 4)).toString() + ":" + (((current_time % 4) * 15).toString()).padStart(2, '0')
                                },
                                value: current_time.toString()
                            }
                            options_list.push(time_options);
                            current_time = current_time + 1;
                        }
                        //console.log(options_list);
                        dropdown_list = {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: "Pick a starting time from the list"
                            },
                            accessory: {
                                type: "static_select",
                                placeholder: {
                                    type: "plain_text",
                                    text: "Select a time"
                                  
                                },
                                options: options_list
                            }
                        }
                       // console.log(dropdown_list);
                        //Math.floor(current_time / 4) + ":" + (((current_time % 4) * 15).toString()).padStart(2,'0'),
                        blocks_data.push(dropdown_list);
                        let message = {
                            attachments: [{
                                blocks:
                                    blocks_data
                            }]
                        }
                        //console.log(blocks_data);
                        slack.send({ channel: payload.channel.id }, message);
                    }
                   // console.log(message)
                }
            });
            
        }
        else if (action.type === "static_select") {
            fs.readFile('./src/schedule.json','utf8', function read(err, data) {
                if (err) {
                    throw err;
                }
                content = data;
                console.log("Printing content of JSON file after getting response from static select:");
                console.log(content);
                console.log(typeof content);
                //console.log(data);

            });
        }
    })
    //console.log(payload.actions[].selected_date);
    //console.log({ channel: payload.channel.id }, { text: payload.actions["wD+"].selected_date + " looks good!" });
    //slack.send({ channel: payload.channel.id }, { text: payload.actions["wD+"].selected_date + " looks good!" });
})

// event handler
slack.on('star_added', 'pin_added', 'reaction_added', payload => {
  let {type, user, item} = payload.event;
    //console.log(user);
  // get the user's current onboarding message
  let message = getStatusMessage(user);


  // modify completed step
  message.attachments.forEach(step => {
    if (step.event === type && !step.completed) {
      step.title += " :white_check_mark:";
      step.color = "#2ab27b";
      step.completed = true;
    }
  });

    let responsetype = "in_channel";
    let value = "true";
    // save the message and update the timestamp
    slack.send({ as_user: value }, message).then(res => {
        let { ts, channel } = res;
        //console.log("Channel = ");
        //console.log(channel);
        users[user] = Object.assign({}, message, { ts: ts, channel: channel });
  });
});


// incoming http requests
slack.listen(PORT);
