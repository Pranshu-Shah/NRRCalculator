const readline = require("readline");
const pointsTable = require("./pointsTable.json"); // Import the JSON file

// Initialize readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Convert base-6 overs to decimal format
function convertOversToDecimal(overs) {
  const [whole, fraction] = overs.toString().split(".").map(Number);
  if (fraction > 5 || fraction < 0) {
    throw new Error("Invalid overs format. Fractions must be between 0 and 5.");
  }
  const decimalFraction = fraction ? (fraction / 6).toFixed(2) : 0;
  return whole + parseFloat(decimalFraction);
}

// Convert decimal format to base-6 overs
function convertDecimalToOvers(decimalOvers) {
  const whole = Math.floor(decimalOvers);
  const fraction = decimalOvers - whole;
  const base6Fraction = Math.round(fraction * 6);
  return base6Fraction === 6 ? `${whole + 1}.0` : `${whole}.${base6Fraction}`;
}

// Handling input overs
function promptOvers(message, callback) {
  rl.question(message, (input) => {
    try {
      const overs = parseFloat(input);
      const [whole, fraction] = input.split(".").map(Number);

      if (fraction > 5 || fraction < 0) {
        console.log("Invalid overs format. Fractions must be between 0 and 5.");
        promptOvers(message, callback);
      } else {
        callback(overs);
      }
    } catch (error) {
      console.log("Invalid input. Please enter a valid overs format.");
      promptOvers(message, callback);
    }
  });
}

// Find a team by acronym
function findTeamByAcronym(userAcronym) {
  return pointsTable.teams.find(
    (team) => team.acronym === userAcronym.toUpperCase()
  );
}

// Prompt user for "my team" and validate
function promptMyTeam() {
  rl.question( "Enter your team acronym (e.g., CSK, RCB, MI, RR, DC): ", (userAcronym) => {
      const myTeam = findTeamByAcronym(userAcronym);
      if (!myTeam) {
        console.log(`Invalid team acronym: ${userAcronym}. Please try again.`);
        promptMyTeam();
      } else {
        console.log(`Your team is: ${myTeam.name}`);
        promptOppositionTeam(myTeam);
      }
    }
  );
}

// Prompt user for "opposition team" and validate
function promptOppositionTeam(myTeam) {
  rl.question( "Enter opposition team acronym which should be different from your team (e.g., CSK, RCB, MI, RR, DC): ", (userAcronym) => {
      const oppositionTeam = findTeamByAcronym(userAcronym);
      if (!oppositionTeam) {
        console.log(`Invalid team acronym: ${userAcronym}. Please try again.`);
        promptOppositionTeam(myTeam);
      } else if (oppositionTeam.acronym === myTeam.acronym) {
        console.log(
          `Opposition team cannot be the same as your team. Please try again.`
        );
        promptOppositionTeam(myTeam);
      } else {
        console.log(`Your opposition team is: ${oppositionTeam.name}`);
        promptMatchDetails(myTeam, oppositionTeam);
      }
    }
  );
}

// Toss
function promptMatchDetails(myTeam, oppositionTeam) {
  rl.question( "Did your team bat first or bowl first? (Enter 'bat' or 'bowl'): ", (tossResult) => {
      tossResult = tossResult.toLowerCase();
      if (tossResult === "bat") {
        promptBattingFirstScenario(myTeam, oppositionTeam);
      } else if (tossResult === "bowl") {
        promptBowlingFirstScenario(myTeam, oppositionTeam);
      } else {
        console.log("Invalid input. Please enter 'bat' or 'bowl'.");
        promptMatchDetails(myTeam, oppositionTeam);
      }
    }
  );
}

// Prompt user for batting first scenario inputs
function promptBattingFirstScenario(myTeam, oppositionTeam) {
  rl.question("Enter runs scored by your team: ", (runsScored) => {
    promptOvers( "Enter overs bowled by your team (e.g., 14.0, 14.5): ", (oversFaced) => {
        calculateSecondInningsForBattingFirst(myTeam, oppositionTeam, parseInt(runsScored), convertOversToDecimal(oversFaced));
      }
    );
  });
}

// Calculate restricted runs range for batting first
function calculateSecondInningsForBattingFirst( myTeam, oppositionTeam, runsScored, oversFaced) {
  rl.question( "Enter the desired position for your team: ", (desiredPosition) => {
      const desiredRank = parseInt(desiredPosition);

      if (isNaN(desiredRank) || desiredRank <= 0 || desiredRank > myTeam.rank || desiredRank > pointsTable.teams.length) {
        console.log(`Invalid desired position: ${desiredRank}. Please try again.`);
        calculateSecondInningsForBattingFirst( myTeam, oppositionTeam, runsScored, oversFaced);
      } else {
        const nrrMin = pointsTable.teams.find( (team) => team.rank === desiredRank).nrr;
        const nrrMax = pointsTable.teams.find((team) => team.rank === desiredRank - 1) ?.nrr || nrrMin;

        const tournamentRunsScored = myTeam.runs_scored;
        const tournamentOversFaced = convertOversToDecimal(myTeam.overs_faced);
        const tournamentRunsConceded = myTeam.runs_conceded;
        const tournamentOversBowled = convertOversToDecimal(myTeam.overs_bowled);
        const matchOversFaced = convertOversToDecimal(oversFaced);

        // Calculate T1
        const T1 = (tournamentRunsScored + runsScored) / (tournamentOversFaced + matchOversFaced);

        // Calculate maxRunsConceded and minRunsConceded
        const matchOversBowled = 20;
        const maxRunsConceded = Math.floor((T1 - nrrMin) * (tournamentOversBowled + matchOversBowled) - tournamentRunsConceded);
        const minRunsConceded = Math.ceil((T1 - nrrMax) * (tournamentOversBowled + matchOversBowled) - tournamentRunsConceded);

        const revisedNRRMax = (T1 - (tournamentRunsConceded + minRunsConceded) / (tournamentOversBowled + matchOversBowled)).toFixed(3);
        const revisedNRRMin = (T1 - (tournamentRunsConceded + maxRunsConceded) / (tournamentOversBowled + matchOversBowled)).toFixed(3);

        console.log(`If ${myTeam.name} scores ${runsScored} runs in ${convertDecimalToOvers(oversFaced)} overs, they need to restrict ${oppositionTeam.name} between ${minRunsConceded} to ${maxRunsConceded} runs.`);
        console.log(`Revised NRR of ${myTeam.name} will be between ${revisedNRRMin} and ${revisedNRRMax}.`);

        rl.close();
      }
    }
  );
}

// Prompt user for bowling first scenario inputs
function promptBowlingFirstScenario(myTeam, oppositionTeam) {
  rl.question("Enter runs conceded by your team: ", (runsConceded) => {
    promptOvers("Enter overs bowled by your team (e.g., 14.0, 14.5): ", (oversBowled) => {
      calculateSecondInningsForBowlingFirst( myTeam, oppositionTeam, parseInt(runsConceded), convertOversToDecimal(oversBowled));
      }
    );
  });
}

// Calculate overs range for bowling first
function calculateSecondInningsForBowlingFirst( myTeam, oppositionTeam, runsConceded, oversBowled) {
  rl.question( "Enter the desired position for your team: ", (desiredPosition) => {
      const desiredRank = parseInt(desiredPosition);

      if ( isNaN(desiredRank) || desiredRank <= 0 || desiredRank > myTeam.rank || desiredRank > pointsTable.teams.length) {
        console.log(`Invalid desired position: ${desiredPosition}. Please try again.`);
        calculateSecondInningsForBowlingFirst( myTeam, oppositionTeam, runsConceded, oversBowled);
      } else {
        const nrrMin = pointsTable.teams.find((team) => team.rank === desiredRank).nrr;
        const nrrMax = pointsTable.teams.find((team) => team.rank === desiredRank - 1) ?.nrr || nrrMin;

        // Tournament stats
        const tournamentRunsScored = myTeam.runs_scored;
        const tournamentOversFaced = convertOversToDecimal(myTeam.overs_faced);
        const tournamentRunsConceded = myTeam.runs_conceded;
        const tournamentOversBowled = convertOversToDecimal(myTeam.overs_bowled);

        // Calculate T2
        const T2 = (tournamentRunsConceded + runsConceded) / (tournamentOversBowled + oversBowled);

        // Calculate min and max overs to chase the target
        const oversMax = (tournamentRunsScored + runsConceded + 1) / (nrrMin + T2) - tournamentOversFaced;
        const oversMin = (tournamentRunsScored + runsConceded + 1) / (nrrMax + T2) - tournamentOversFaced;

        const revisedNRRMin = ((tournamentRunsScored + runsConceded + 1) / (tournamentOversFaced + oversMax) - T2).toFixed(3);
        const revisedNRRMax = ((tournamentRunsScored + runsConceded + 1) / (tournamentOversFaced + oversMin) - T2).toFixed(3);

        console.log(`If ${oppositionTeam.name} scores ${runsConceded} runs in ${convertDecimalToOvers(oversBowled)} overs, ${myTeam.name} must chase the target in between ${convertDecimalToOvers(oversMin)} and ${convertDecimalToOvers(oversMax)} overs.`);
        console.log(`Revised NRR of ${myTeam.name} will be between ${revisedNRRMin} and ${revisedNRRMax}.`);

        rl.close();
      }
    }
  );
}

// Start the process
promptMyTeam();