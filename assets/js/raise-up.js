// Hand raise state
var handRaiseState = false;

// Append a raise hand button for audience (hosts cannot raise their hand)
async function join() {
  // create Agora client
  client.setClientRole(options.role);
  $('#mic-btn').prop('disabled', false);
  $('#video-btn').prop('disabled', false);
  if (options.role === 'audience') {
    $('#mic-btn').prop('disabled', true);
    $('#video-btn').prop('disabled', true);
    $('#raise-hand-div').append(
      `<button id="raise-hand" type="button" class="btn btn-live btn-sm" disabled>Raise Hand</button>`
    );
    // Event listeners
    client.on('user-published', handleUserPublished);
    client.on('user-joined', handleUserJoined);
    client.on('user-left', handleUserLeft);
  }
}

// RTM Channel Join
var channelName = $('#channel').val();
channel = clientRTM.createChannel(channelName);
channel
  .join()
  .then(() => {
    console.log('AgoraRTM client channel join success.');
    // Send channel message for raising hand
    $(document).on('click', '#raise-hand', async function () {
      fullDivId = $(this).attr('id');
      // handRaiseState 에 따른 메시지 보내기
      if (handRaiseState === false) {
        $('#raise-hand').text('Lower Hand');
        handRaiseState = true;
        console.log('Hand raised.');
        // Inform channel that rand was raised
        await channel
          .sendMessage({ text: 'raised' })
          .then(() => {
            console.log('Message sent successfully.');
            console.log('Your message was: raised' + ' sent by: ' + accountName);
          })
          .catch((err) => {
            console.error('Message sending failed: ' + err);
          });
      } else if (handRaiseState === true) {
        $('#raise-hand').text('Raise Hand');
        handRaiseState = false;
        console.log('Hand lowered.');
        // Inform channel that rand was raised
        await channel
          .sendMessage({ text: 'lowered' })
          .then(() => {
            console.log('Message sent successfully.');
            console.log('Your message was: lowered' + ' sent by: ' + accountName);
          })
          .catch((err) => {
            console.error('Message sending failed: ' + err);
          });
      }
    });
    // Get channel message when someone raises hand
    channel.on('ChannelMessage', async function (text, peerId) {
      console.log(peerId + ' changed their hand raise state to ' + text.text);
      if (options.role === 'host') {
        if (text.text == 'raised') {
          // Ask host if user who raised their hand should be called onto stage or not
          if (confirm(peerId + ' raised their hand. Do you want to make them a host?')) {
            // Call user onto stage
            console.log('The host accepted ' + peerId + "'s request.");
            // Send approval message
          } else {
            // Inform the user that they were not made a host
            console.log('The host rejected ' + peerId + "'s request.");
            // Send rejection message
          }
        } else if (text.text == 'lowered') {
          console.log('Hand lowered so host can ignore this.');
        }
      }
    });
  })
  .catch((error) => {
    console.log('AgoraRTM client channel join failed: ', error);
  })
  .catch((err) => {
    console.log('AgoraRTM client login failure: ', err);
  });

// Get channel message when someone raises hand
channel.on('ChannelMessage', async function (text, peerId) {
  console.log(peerId + ' changed their hand raise state to ' + text.text);
  if (options.role === 'host') {
    if (text.text == 'raised') {
      // Ask host if user who raised their hand should be called onto stage or not
      $('#confirm').modal('show');
      $('#modal-body').text(peerId + ' raised their hand. Do you want to make them a host?');
      $('#promoteAccept').click(async function () {
        // Call user onto stage
        console.log('The host accepted ' + peerId + "'s request.");
        await clientRTM
          .sendMessageToPeer(
            {
              text: 'host',
            },
            peerId
          )
          .then((sendResult) => {
            if (sendResult.hasPeerReceived) {
              console.log('Message has been received by: ' + peerId + ' Message: host');
            } else {
              console.log('Message sent to: ' + peerId + ' Message: host');
            }
          })
          .catch((error) => {
            console.log('Error sending peer message: ' + error);
          });
        $('#confirm').modal('hide');
      });
      $('#cancel').click(async function () {
        // Inform the user that they were not made a host
        console.log('The host rejected ' + peerId + "'s request.");
        await clientRTM
          .sendMessageToPeer(
            {
              text: 'audience',
            },
            peerId
          )
          .then((sendResult) => {
            if (sendResult.hasPeerReceived) {
              console.log('Message has been received by: ' + peerId + ' Message: audience');
            } else {
              console.log('Message sent to: ' + peerId + ' Message: audience');
            }
          })
          .catch((error) => {
            console.log('Error sending peer message: ' + error);
          });
        $('#confirm').modal('hide');
      });
    } else if (text.text == 'lowered') {
      $('#confirm').modal('hide');
      console.log('Hand lowered so host can ignore this.');
    }
  }
});

// Display messages from host when they approve the request
clientRTM
  .on('MessageFromPeer', async function ({ text }, peerId) {
    console.log(peerId + ' changed your role to ' + text);
    if (text === 'host') {
      await leave();
      options.role = 'host';
      console.log('Role changed to host.');
      await client.setClientRole('host');
      await join();
      $('#host-join').attr('disabled', true);
      $('#audience-join').attr('disabled', true);
      $('#raise-hand').attr('disabled', false);
      $('#leave').attr('disabled', false);
    } else if (text === 'audience' && options.role !== 'audience') {
      alert('The host rejected your proposal to be called onto stage.');
      $('#raise-hand').attr('disabled', false);
    }
  })
  .catch((error) => {
    console.log('AgoraRTM client channel join failed: ', error);
  })
  .catch((err) => {
    console.log('AgoraRTM client login failure: ', err);
  });
