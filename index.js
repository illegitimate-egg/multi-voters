const log4js = require('log4js');
const logger = log4js.getLogger();
const fs = require('fs');
const { join } = require('node:path');
const selector = require('./selector');
const { shuffle } = require('./contrib');
const { WidgetMember } = require('discord.js');
const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

// USER CONSTANTS
const num_players = 1;
logger.level = 'debug';
// END OF USER CONSTANTS


fs.readFile("items.txt", "utf-8", (err, data) => {
  if (err) {
    logger.error("Error reading items.txt: ", err);
    return;
  }

  let matches = selector.choose_two(data.trim().split(/\r?\n/));
  logger.info("Finished finding combinations. Found: " + matches.length + ". Expected: " + selector.choose_two_int(data.trim().split(/\r?\n/).length) + ".");
  console.assert(matches.length == selector.choose_two_int(data.trim().split(/\r?\n/).length));

  let players = [];

  for (let i = 0; i < num_players; i++) {
    players.push({ id: i, round: 0, deck: [], deck_size: 0 });
  }

  if (matches.length % num_players) {
    logger.warn("Number of combinations (" + matches.length + ") is not divisible by number of players (" + num_players + "). Compromising.")
    for (let i = 0; i < num_players; i++) {
      players[i].deck_size = Math.floor(matches.length / num_players);
      if (i < matches.length % num_players) {
        players[i].deck_size++;
      }
    }

    let deck_string = "";

    for (let i = 0; i < num_players; i++) {
      deck_string += players[i].deck_size + " ";
    }

    logger.info("Compromise in use: " + deck_string);
  } else {
    for (let i = 0; i < num_players; i++) {
      players[i].deck_size = matches.length / num_players;
    }

    let deck_string = "";

    for (let i = 0; i < num_players; i++) {
      deck_string += players[i].deck_size + " ";
    }

    logger.info("Deck split: " + deck_string);
  }

  for (let i = 0; i < num_players; i++) {
    for (let j = 0; j < players[i].deck_size; j++) {
      players[i].deck[j] = matches[j * num_players + i];
    }
  }

  logger.info("Shuffling decks...");
  for (let i = 0; i < num_players; i++) {
    shuffle(players[i].deck);
  }

  app.get('/', (_req, res) => {
    res.send("<h1>Please use your given link (with ID)");
  });

  for (let i = 0; i < num_players; i++) {
    app.get('/' + (i + 1), (_req, res) => {
      res.sendFile(join(__dirname, 'index.html'));
    });
  }

  const results = {};
  let data_processed = data.trim().split(/\r?\n/);
  for(let i = 0; i < data_processed.length; i++) {
    results[data_processed[i]] = 0;
  }
  let sortable = [];

  io.on('connection', (socket) => {
    let player_id;

    socket.on('ident', (msg) => {
      player_id = msg - 1;
      logger.info("New socket connection with player " + (player_id + 1) + ", I am elated.")
      if (players[player_id].round < players[player_id].deck_size) {
        socket.emit('voting_status', (players[player_id].round + 1) + "/" + players[player_id].deck_size);
        socket.emit('options', players[player_id].deck[players[player_id].round]);
      } else {
        socket.emit('voting_status', "Voting Complete");
      }
    });

    socket.on('result', (msg) => {
      // Made redudant, but still safe
      if (isNaN(results[msg])) {
        results[msg] = 0;
      }
      results[msg]++;
      players[player_id].round++;

      let total = 0;

      for (const [_key, value] of Object.entries(results)) {
        total += value;
      }

      if (total == matches.length) {
        for (const [key, value] of Object.entries(results)) {
          sortable.push([key, value]);
          // console.log(`${key}: ${value}`);
        }
        sortable.sort(function(a, b) {
          return a[1] - b[1];
        });

        console.log(sortable);
      }
    });

    socket.on('disconnect', () => {
      logger.info('Socket closed, I lament.');
    });
  });

  server.listen(3000, () => {
    logger.info("listening on *:3000");
  });
});

