const ts = require('tinyspeck'),
    { PORT, TOKEN } = process.env,
    users = {};
//schedule_obj = require('./schedule.json');
var fs = require('fs');
const BOT_CHANNEL = 'DK0HTCCSX'

// setting defaults for all Slack API calls
let slack = ts.instance({ token: TOKEN });
let state = 0;
let start_time_set = false;
let end_time_set = false;
let title_set = false;
let chosen_title = "Unspecified";
let chosen_date = null;
let end_time_ts = null;
let schedule_ts = null;
let date_exists = false;
let date_position = -1;
let min_time_index = 24;
let max_time_index = 72;
let ts_list = [];
let deleted_positions = [];
let first_datepicker = true;

function resetValues() {
    start_time_set = false;
    end_time_set = false;
    title_set = false;
    chosen_title = "Unspecified";
    chosen_date = null;
    end_time_ts = null;
    //schedule_ts = null;
    date_exists = false;
    date_position = -1;
    min_time_index = 24;
    max_time_index = 72;
    //ts_list = [];
    //console.log("Reset is called!!!");
}

function adjustedPosition(position) {
    let count = 0;
    deleted_positions.forEach(num => {
        if (num <= position) count++;
    });
    return count;
}

function timeouts() {
    ts_list.forEach(element => {
        slack.send('chat.delete',{ channel: element.channel, ts: element.ts});
    });
    ts_list = [];
    resetValues();
}
// build the user's current onboarding message
function getHelpMessage() {
    return Object.assign(autobot_help.welcome);
}

slack.on('/autobot', payload => {
    console.log(payload);
    autobot_help = require('./autobot.json');
    let { response_url } = payload;
    let message = getHelpMessage();
    let responsetype = "ephemeral";
    slack.send(response_url, { response_type: responsetype }, message);
});

function getTodayDate() {
    let today = new Date();
    let dd = String(today.getDate()).padStart(2, '0');
    let mm = String(today.getMonth() + 1).padStart(2, '0');
    let yyyy = String(today.getFullYear());
    return (yyyy + "-" + mm + "-" + dd);
}

function datePickerMessage(user) {
    return {
        blocks: [{
            type: "section",
            text: {
                type: "mrkdwn",
                text: "Hi! <@" + user + ">, Would you like to book the conference room?"
            },
            accessory: {
                type: "datepicker",
                initial_date: today,
                placeholder: {
                    type: "plain_text",
                    text: "Select a date",
                    emoji: true
                }
            }
        }]
    };
}
slack.on('app_mention', payload => {
    //let { event } = payload;
    first_datepicker = true;
    let { user, channel, text } = payload.event;
    let words = text.split(" ");
    if (words.length <= 2) {
        if (words.includes("thanks") || words.includes("Thanks!") || words.includes("Thanks") || words.includes("thanks!") || words.includes("Thank you") || words.includes("thank you")) {
            slack.send({ channel: channel, text: "<@" + user + ">, Of course!" })
        }
        else {
            today = getTodayDate();
            let message = datePickerMessage(user);
            slack.send({ channel: channel, text: "Autobot responding..." }, message).then(payload2 => {
                let { channel, ts } = payload2;
                ts_list.push({ channel: channel, ts: ts });
                console.log(ts_list);
                setTimeout((channel1, ts1) => {
                    slack.send('chat.delete',{channel: channel1,ts: ts1});
                },60000, channel, ts);


            });
        }
    }
    else {
        slack.send({ channel: channel, text: "<@" + user + ">, Too many words! Autobot isn't sentient... yet..." });
        slack.send({ channel: channel, text: "Type /help for info" });
        
    }
});


slack.on('message', payload => {
    //console.log(payload);
    first_datepicker = true;
    let { user, channel, text, subtype } = payload.event;
    if (subtype === "bot_message" || subtype === 'message_changed' || channel!== BOT_CHANNEL) return;
    let words = text.split(" ");
    if (words.length <= 2) {
        if (words.includes("thanks") || words.includes("Thanks!") || words.includes("Thanks") || words.includes("thanks!") || words.includes("Thank you") || words.includes("thank you")) {
            slack.send({ channel: channel, text: "<@" + user + ">, Of course!" })
        }
        else {
            today = getTodayDate();
            let message = datePickerMessage(user);
            slack.send({ channel: channel, text: "Autobot responding..." }, message).then(payload2 => {
                let { channel, ts } = payload2;
                ts_list.push({ channel: channel, ts: ts });
                console.log(ts_list);
                setTimeout((channel1, ts1) => {
                    slack.send('chat.delete', { channel: channel1, ts: ts1 });
                }, 60000, channel, ts);
            });
        }
    }
    else {
        slack.send({ channel: channel, text: "<@" + user + ">, Too many words! Autobot isn't sentient... yet..." });
        slack.send({ channel: channel, text: "Type /autobot for info" });
    }
    //slack.send({ channel: channel, text: "Dudu responding..." }, message);
});


//--------------------------------------------------------------------------------------------------------------------



function dividerBlock() {
    return {
        type: "divider"
    };
}

function scheduleHeader(date) {
    return {
        type: "section",
        text: {
            type: "mrkdwn",
            text: "Schedule for the day of *" + date + "*"
        }
    };
}

function titleOptions() {
    let title_name_options = ["Team meeting", "Conference call", "Hosting guests", "Personal", "Ping-pong", "Unspecified"]
    let title_options_list = [];
    for (let i = 0; i < 6; i++) {
        title_option = {
            text: {
                type: "plain_text",
                text: title_name_options[i]
            },
            value: title_name_options[i]
        }
        title_options_list.push(title_option);
    }
    return title_options_list;
}
slack.on("block_actions", payload => {

    payload.actions.forEach(action => {

        if (action.type === "button") {
            //console.log(payload);
            //let { response_url } = payload;
            if (action.action_id === "cancel") {
                let words = action.value.split(" ");
                //console.log(words);
                fs.readFile('./src/schedule.json', 'utf8', function read(err, data) {
                    if (err) {
                        throw err;
                    }
                    let schedule_obj = JSON.parse(data);
                    console.log(schedule_obj);
                    date_position = schedule_obj.conference_schedule.findIndex(element => { return element.date === chosen_date });
                    console.log(date_position);
                 
                    if (schedule_obj.conference_schedule[date_position].date === words[1]) {
                        let booking_position = schedule_obj.conference_schedule[date_position].bookings.findIndex(element => { return element.timeslots[0] === words[2] });
                        if (booking_position !== -1 &&
                            schedule_obj.conference_schedule[date_position].bookings[booking_position].user_id === words[0]) {
                            console.log("Deleting booking entry " + booking_position + " on " + words[1]);
                            schedule_obj.conference_schedule[date_position].bookings.splice(booking_position, 1);
                            //console.log(schedule_obj.conference_schedule[date_position]);

                            if (schedule_obj.conference_schedule[date_position].bookings.length === 0) {
                                console.log("No more entries in bookings, deleting...");
                                schedule_obj.conference_schedule.splice(date_position, 1);
                                date_exists = false;
                            }
                            json = JSON.stringify(schedule_obj, null, 4);
                            fs.writeFile('./src/schedule.json', json, 'utf8', function read(err, data) {
                                if (err) {
                                    throw err;
                                }
                                deleted_positions.push(booking_position);
                            });
                       
                                let { blocks } = payload.message;
                                confirmation_message = {
                                    type: "section",
                                    text: {
                                        type: "mrkdwn",
                                        text: "This booking has been removed!"
                                    }
                            }
                            console.log("Booking position = " + booking_position);
                            console.log("Adjsted position = " + adjustedPosition(booking_position));
                                blocks.splice(booking_position+2+adjustedPosition(booking_position), 1, confirmation_message);
                                console.log(blocks);
                                let message = {
                                    blocks
                            }
                            console.log("schedule_ts = " + schedule_ts);
                            slack.send('chat.update',{ ts: schedule_ts, channel: payload.channel.id }, message).then(payload2 => {
                                schedule_ts = payload2.ts;
                                //console.log("schedule_ts = " + schedule_ts);
                            });
                                
                            
                        }
                    }
                
                });
            }
        }

        else if (action.type === "datepicker") {
            resetValues();
            deleted_positions = [];
            //console.log(action.selected_date);
            chosen_date = action.selected_date;
            fs.readFile('./src/schedule.json', 'utf8', function read(err, data) {
                if (err) {
                    throw err;
                }
                schedule_obj = JSON.parse(data);
                date_position = schedule_obj.conference_schedule.findIndex(element => { return element.date === action.selected_date });
                let used_timeslots = [];
                let blocks_data = [];

                blocks_data.push(scheduleHeader(action.selected_date));
                blocks_data.push(dividerBlock());

                if (date_position === -1 || schedule_obj.conference_schedule[date_position].bookings.length === 0) {
                    unit_block = {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: "No bookings!"
                        }
                    }
                    blocks_data.push(unit_block);

                }
                else {
                    date_exists = true;
                    schedule_obj.conference_schedule[date_position].bookings.forEach(booking => {
                        //let unit_block = new dict();
                        unit_block = {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: "<@" + booking.user_id + "> has booked from *" + booking.start_time + "* to *" + booking.end_time + "*"
                            },
                            accessory: {
                                type: "button",
                                text: {
                                    type: "plain_text",
                                    text: "Cancel",
                                },
                                confirm: {
                                    title: {
                                        type: "plain_text",
                                        text: "Are you sure?"
                                    },
                                    text: {
                                        type: "mrkdwn",
                                        text: "Click confirm to remove this booking"
                                    },
                                    confirm: {
                                        type: "plain_text",
                                        text: "Confirm"
                                    },
                                    deny: {
                                        type: "plain_text",
                                        text: "Go back"
                                    }
                                },
                                value: booking.user_id + " " + chosen_date + " " + booking.timeslots[0],
                                action_id: "cancel"

                            }
                        }
                        blocks_data.push(unit_block);

                        used_timeslots.push(...booking.timeslots);
                    });
                }
                blocks_data.push(dividerBlock());


                title_options_list = titleOptions();
                title_block = {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "Pick an appropriate title for the booking"
                    },
                    accessory: {
                        type: "static_select",
                        action_id: "title",
                        placeholder: {
                            type: "plain_text",
                            text: "Select a title"

                        },
                        options: title_options_list
                    }
                }
                blocks_data.push(title_block);


                current_time = min_time_index;
                let start_time_list = [];
                while (current_time < max_time_index) {
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
                    start_time_list.push(time_options);
                    current_time = current_time + 1;
                }

                //console.log(start_time_list);
                start_time_block = {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "Pick a starting time from the list"
                    },
                    accessory: {
                        type: "static_select",
                        action_id: "start_time",
                        placeholder: {
                            type: "plain_text",
                            text: "Select a time"

                        },
                        options: start_time_list
                    }
                }
                blocks_data.push(start_time_block);


                let message = {
                    blocks:
                        blocks_data
                }
                //console.log(blocks_data);
                if (first_datepicker) {
                    slack.send({ channel: payload.channel.id }, message).then(payload2 => {
                        let { channel, ts } = payload2;
                        schedule_ts = payload2.ts;
                        first_datepicker = false;
                        ts_list.push({ channel: channel, ts: ts });
                        //console.log(ts_list);
                        setTimeout((channel1, ts1) => {
                            slack.send('chat.delete', { channel: channel1, ts: ts1 });
                        }, 60000, channel, ts);
                    });
                }
                else {
                    console.log("Not first date picker!"+schedule_ts);
                    slack.send('chat.update',{ ts: schedule_ts, channel: payload.channel.id }, message).then(payload2 => {
                        let { channel, ts } = payload2;
                        schedule_ts = payload2.ts;
                        ts_list.push({ channel: channel, ts: ts });
                        //console.log(ts_list);
                        setTimeout((channel1, ts1) => {
                            slack.send('chat.delete', { channel: channel1, ts: ts1 });
                        }, 60000, channel, ts);
                    });
                }
            });
        }
        else if (action.type === "static_select") {
            fs.readFile('./src/schedule.json', 'utf8', function read(err, data) {
                if (err) {
                    throw err;
                }
                let schedule_obj = JSON.parse(data);

                if (action.action_id === "title") {
                    chosen_title = action.selected_option.text.text;
                    title_set = true;
                    console.log("Chosen_title : " + chosen_title);
                    choosing_user = payload.user.id;
                    console.log("Choosing_user : " + choosing_user);
                }
                else if (action.action_id === "start_time") {
                    start_time_index = action.selected_option.value;
                    start_time_set = true;
                    console.log("Start time index : " + start_time_index);
                    start_time = action.selected_option.text.text
                    choosing_user = payload.user.id;
                    end_time_index = max_time_index;
                    if (date_exists) {
                        for (let i = 0; i < schedule_obj.conference_schedule[date_position].bookings.length; i++) {
                            if (start_time_index < schedule_obj.conference_schedule[date_position].bookings[i].timeslots[0]) {
                                end_time_index = schedule_obj.conference_schedule[date_position].bookings[i].timeslots[0];
                                break;
                            }
                        }
                    }
                    console.log("End time index : " + end_time_index);
                    let blocks_data = [];
                    current_time = Number(start_time_index) + 1;

                    let end_time_list = [];
                    while (current_time <= end_time_index) {
                        time_options = {
                            text: {
                                type: "plain_text",
                                text: (Math.floor(current_time / 4)).toString() + ":" + (((current_time % 4) * 15).toString()).padStart(2, '0')
                            },
                            value: current_time.toString()
                        }
                        end_time_list.push(time_options);
                        current_time = current_time + 1;
                    }

                    //console.log(start_time_list);
                    end_time_block = {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: "Pick an ending time from the list"
                        },
                        accessory: {
                            type: "static_select",
                            action_id: "end_time",
                            placeholder: {
                                type: "plain_text",
                                text: "Select a time"

                            },
                            options: end_time_list
                        }
                    }
                    blocks_data.push(end_time_block);


                    let message = {
                        blocks:
                            blocks_data

                    }
                    //console.log(blocks_data);
                    if (end_time_ts === null) {
                        slack.send({ channel: payload.channel.id }, message).then(payload2 => {
                            let { channel, ts } = payload2;
                            end_time_ts = ts;
                            ts_list.push({ channel: channel, ts: ts });
                            console.log(ts_list);
                            setTimeout((channel1, ts1) => {
                                slack.send('chat.delete', { channel: channel1, ts: ts1 });
                            }, 60000, channel, ts);
                        });
                    }
                    else {
                        console.log("replacing endtime prompt!");
                        slack.send({ channel: payload.channel.id, ts: end_time_ts }, message).then(payload2 => {
                            let { channel, ts } = payload2;
                            ts_list.push({ channel: channel, ts: ts });
                            console.log(ts_list);
                            setTimeout((channel1, ts1) => {
                                slack.send('chat.delete', { channel: channel1, ts: ts1 });
                            }, 60000, channel, ts);
                        });
                    }

                }
                else if (action.action_id === "end_time") {
                    end_time_ts = payload.message.ts;
                    end_time_set = true;
                    end_time_index = action.selected_option.value;
                    console.log("End time index : " + end_time_index);
                    end_time = action.selected_option.text.text
                }

                if (start_time_set && end_time_set) {
                    let timeslots = [];
                    for (let i = Number(start_time_index); i < Number(end_time_index); i++) {
                        timeslots.push(i.toString());
                    }
                    booking = {
                        title: chosen_title,
                        user_id: payload.user.id,
                        start_time: start_time,
                        end_time: end_time,
                        timeslots: timeslots
                    }
                    if (date_exists === false) {
                        schedule_obj.conference_schedule.push({
                            date: chosen_date,
                            bookings: [booking]
                        });
                        schedule_obj.conference_schedule.sort((a, b) => {
                            let result = 0;
                            let date1 = a.date.split("-");
                            let date2 = b.date.split("-");
                            yyyy1 = Number(date1[0]);
                            yyyy2 = Number(date2[0]);
                            mm1 = Number(date1[1]);
                            mm2 = Number(date2[1]);
                            dd1 = Number(date1[2]);
                            dd2 = Number(date2[2]);
                            if (yyyy1 > yyyy2) result = 1;
                            else if (yyyy1 < yyyy2) result = -1;
                            else {
                                if (mm1 > mm2) result = 1;
                                else if (mm1 < mm2) result = -1;
                                else {
                                    if (dd1 > dd2) result = 1;
                                    else if (dd1 < dd2) result = -1;
                                    else result = 0;
                                }
                            }
                            return result;
                        });

                    }
                    else {
                        schedule_obj.conference_schedule[date_position].bookings.push(booking);
                        schedule_obj.conference_schedule[date_position].bookings.sort((a, b) => {
                            let result = 0;
                            num1 = a.timeslots[0].padStart(2, '0');
                            num2 = b.timeslots[0].padStart(2, '0');
                            if (num1 > num2) result = 1;

                            if (num1 < num2) result = -1;
                            return result;
                        });
                    }
                    json = JSON.stringify(schedule_obj, null, 4);
                    fs.writeFile('./src/schedule.json', json, 'utf8', function read(err, data) {
                        if (err) {
                            throw err;
                        }
                    });
                        confirmation_message = {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: "<@" + payload.user.id + ">, You have booked the conference room on " + chosen_date + " from " + start_time + " to " + end_time
                            }
                        }
                        let message = {
                            blocks: [
                                confirmation_message
                            ]
                        }
                        slack.send({ channel: payload.channel.id, link_names: "true" }, message).then(payload2 => {
                            console.log(ts_list);
                            setTimeout(timeouts, 2000);
                            
                        });
                    
                }
            });
        }
    })
})


// incoming http requests
slack.listen(PORT);
