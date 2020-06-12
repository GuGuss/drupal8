/**
 * Returns a key/value object containing all variables relevant for the activity.
 *
 * That includes project level variables, plus any variables visible for
 * the relevant environment for the activity, if any.
 *
 * Note that JSON-encoded values will show up as a string, and need to be
 * decoded with JSON.parse().
 */
function variables() {
    var vars = {};
    activity.payload.deployment.variables.forEach(function(variable) {
        vars[variable.name] = variable.value;
    });
    return vars;
}

/**
 * Sends a color-coded formatted message to Slack.
 *
 * You must first configure a Platform.sh variable named "SLACK_URL".
 * That is the group and channel to which the message will be sent.
 *
 * To control what events it will run on, use the --events switch in
 * the Platform.sh CLI.
 *
 * @param {string} title
 *   The title of the message block to send.
 * @param {string} message
 *   The message body to send.
 */
function sendSlackMessage(title, message) {
    var body = {
        'attachments': [{
            'title': title,
            'text': message,
            'color': 'good',
        }],
    };
    var url = variables()['SLACK_URL'];
    if (!url) {
        throw new Error('You must define a SLACK_URL project variable.');
    }
    var resp = fetch(url,{
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (!resp.ok) {
        console.log('[LOG] Sending slack message failed: ' + resp.body.text());
    }
}

/**
 * Extract the JSON output of 'composer outdated' as a nice formatted text.
 *
 * @param {json} composerDiff
 *   The output of 'composer outdated --format json' command
 */
function extractComposerDiff(composerDiff) {
    var result = composerDiff.installed.map(function(i) { 
        if (i['latest-status'] == 'up-to-date') return '';
        return '- Updated ' + i.name + ' (' + i.version + ' => ' + i.latest + '): ' + i['latest-status'] + '\n';
    });
    return result.join('');
}

// @TODO: load it properly via a forEach() function. Currently it's hardcoded with the app name.
var composerDiff = activity.payload.deployment.webapps.app.variables.env['COMPOSER_DIFF'];
var message = extractComposerDiff(composerDiff);
var title = 'Composer packages have been updated on the environment: "' + activity.payload.environment.name + '" (' + activity.payload.environment.project + ')';
sendSlackMessage(title, message);
