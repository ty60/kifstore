import Kifu from './kifu.js';


document.addEventListener('DOMContentLoaded', () => {
  init();
});


const KARA = -1;
const FU = 0;
const KYOU = 1;
const KEI = 2;
const GIN = 3;
const KIN = 4;
const KAKU = 5;
const HISHA = 6;
const GYOKU = 7;

const PLAYER = 0;
const OPPONENT = 1;

const FIRST_MOVE             = 0;
const PLAYER_SELECTING       = 1;
const PLAYER_HOLDING_PIECE   = 2;
const OPPONENT_SELECTING     = 3;
const OPPONENT_HOLDING_PIECE = 4;
const SELECT_PROMOTION       = 5

class Piece {
  constructor () {
    this.type = KARA;
    this.owner = PLAYER;
    this.promoted = false;
    this.selected = false;
  }
}


class Game {
  constructor () {
    this.kifu = new Kifu();

    const board = [];
    for (let y = 0; y < 9; y++) {
      board.push([]);
      for (let x = 0; x < 9; x++) {
        board[y].push({});
        board[y][x].piece = new Piece();
      }
    }

    for (let x = 0; x < 9; x++) {
      board[2][x].piece.type = board[6][x].piece.type = FU;
    }
    board[0][0].piece.type = board[0][8].piece.type = board[8][0].piece.type = board[8][8].piece.type  = KYOU;
    board[0][1].piece.type = board[0][7].piece.type = board[8][1].piece.type = board[8][7].piece.type  = KEI;
    board[0][2].piece.type = board[0][6].piece.type = board[8][2].piece.type = board[8][6].piece.type  = GIN;
    board[0][3].piece.type = board[0][5].piece.type = board[8][3].piece.type = board[8][5].piece.type  = KIN;
    board[1][7].piece.type = board[7][1].piece.type  = KAKU;
    board[1][1].piece.type = board[7][7].piece.type  = HISHA;
    board[0][4].piece.type = board[8][4].piece.type  = GYOKU;

    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 9; x++) {
        board[y][x].piece.owner = OPPONENT;
      }
    }

    this.board = board;
    this.state = FIRST_MOVE;

    this.playerPiecesInHand   = new Array(8);
    this.opponentPiecesInHand = new Array(8);
    for (let i = 0; i < 8; i++) {
      this.playerPiecesInHand[i]       = {};
      this.playerPiecesInHand[i].num   = 0;
      this.opponentPiecesInHand[i]     = {};
      this.opponentPiecesInHand[i].num = 0;
    }

    this.selectedX = -1;
    this.selectedY = -1;

    this.promotingX = -1;
    this.promotingY = -1;

    this.lastX = -1;
    this.lastY = -1;

    this.inHandIsPlayer = false;
    this.inHandIsOpponent = false;
    this.inHandPieceId = -1;

    this.turn = 1;
    this.turnShowing = 1;

    this.coveredPiece = null;

    this.savedState = null;
    this.isReplaying = false;
  }

  checkOwnership(x, y) {
    const piece = this.board[y][x].piece;

    if (piece.type === KARA) {
      return false;
    }

    if ((this.state === PLAYER_SELECTING || this.state === PLAYER_HOLDING_PIECE) && piece.owner === PLAYER) {
      return true;
    }

    if ((this.state === OPPONENT_SELECTING || this.state === OPPONENT_HOLDING_PIECE) && piece.owner === OPPONENT) {
      return true;
    }

    return false;
  }

  get selected() {
    return [this.selectedX, this.selectedY];
  }

  select(x, y) {
    const piece = this.board[y][x].piece;
    piece.selected = true;
    this.selectedX = x;
    this.selectedY = y;
  }

  unselect() {
    this.selectedX = this.selectedY = -1;
    this.inHandPieceId = -1;
    this.inHandIsPlayer = false;
    this.inHandIsOpponent = false;
  }

  moveTo(x, y) {
    // Play piece from pieces in hand
    if (this.inHandIsPlayer || this.inHandIsOpponent) {
      if (this.board[y][x].piece.type !== KARA) {
        return;
      }

      this.board[y][x].piece.type = this.inHandPieceId;
      this.board[y][x].piece.owner = this.inHandIsPlayer ? PLAYER : OPPONENT;
      this.board[y][x].piece.promoted = false;

      this.lastX = x;
      this.lastY = y;

      if (this.inHandIsPlayer) {
        this.playerPiecesInHand[this.inHandPieceId].num--;
      } else {
        this.opponentPiecesInHand[this.inHandPieceId].num--;
      }

      this.inHandIsPlayer = this.inHandIsOpponent = false;
      this.inHandPieceId = -1;

      this.kifu.addMove(this.turn, this.board[y][x].piece.owner, 0, 0, transToKifX(x), transToKifY(y),
                        pieceToChar(this.board[y][x].piece), false, true, KARA, false);

      this.turn++;
      this.turnShowing = this.turn;
      return;
    }

    let [fromX, fromY] = this.selected;

    let pieceTakenId = KARA;
    let pieceTakenPromoted = false;
    if (this.board[y][x].piece.type !== KARA && !this.checkOwnership(x, y)) {
      pieceTakenId = this.board[y][x].piece.type;
      pieceTakenPromoted = this.board[y][x].piece.promoted;
      if (this.state === PLAYER_HOLDING_PIECE) {
        this.playerPiecesInHand[pieceTakenId].num++;
      } else {
        this.opponentPiecesInHand[pieceTakenId].num++;
      }
    }

    this.board[y][x].piece.type = this.board[fromY][fromX].piece.type;
    this.board[y][x].piece.owner = this.board[fromY][fromX].piece.owner;

    let clearFrom = true;

    // TODO: Clean up the promotion code below
    const canPromote = (fromY, toY, piece) => {
      if (piece.promoted) {
        return false;
      } else if (piece.type === KIN || piece.type === GYOKU) {
        return false;
      } else if (piece.owner === PLAYER && ((0 <= fromY && fromY <= 2) || (0 <= toY && toY <= 2)) && !piece.promoted) {
        return true;
      } else if (piece.owner === OPPONENT && ((6 <= fromY && fromY <= 8) || (6 <= toY && toY <= 8)) && !piece.promoted) {
        return true;
      } else {
        return false;
      }
    };
    const mustPromote = (toY, piece) => {
      if (piece.owner === PLAYER && toY === 0) {
        return piece.type === FU || piece.type === KEI || piece.type === KYOU;
      } else if (piece.owner === OPPONENT && toY === 8) {
        return piece.type === FU || piece.type === KEI || piece.type === KYOU;
      } else {
        false;
      }
    };
    if (this.board[fromY][fromX].piece.owner === PLAYER && canPromote(fromY, y, this.board[fromY][fromX].piece)) {
      if (mustPromote(y, this.board[fromY][fromX].piece)) {
        this.board[y][x].piece.promoted = true;
      } else {
        this.coveredPiece = this.board[y + 1][x].piece;

        const promCan = new Piece();
        promCan.type = this.board[y][x].piece.type;
        promCan.owner = this.board[y][x].piece.owner;
        promCan.promoted = true;
        this.board[y + 1][x].piece = promCan;

        if (fromX === x && fromY === y + 1) {
          clearFrom = false;
        }
      }
    } else if (this.board[fromY][fromX].piece.owner === OPPONENT && canPromote(fromY, y, this.board[fromY][fromX].piece)) {
      if (mustPromote(y, this.board[fromY][fromX].piece)) {
        this.board[y][x].piece.promoted = true;
      } else {
        this.coveredPiece = this.board[y - 1][x].piece;

        const promCan = new Piece();
        promCan.type = this.board[y][x].piece.type;
        promCan.owner = this.board[y][x].piece.owner;
        promCan.promoted = true;
        this.board[y - 1][x].piece = promCan;

        if (fromX === x && fromY === y - 1) {
          clearFrom = false;
        }
      }
    } else {
      this.board[y][x].piece.promoted = this.board[fromY][fromX].piece.promoted;
    }

    this.kifu.addMove(this.turn,this.board[fromY][fromX].piece.owner, transToKifX(fromX), transToKifY(fromY),
      transToKifX(x), transToKifY(y), pieceToChar(this.board[y][x].piece),
      !this.board[fromY][fromX].piece.promoted && this.board[y][x].piece.promoted, false,
      pieceTakenId, pieceTakenPromoted);

    // Is the move is determined (i.e., no promotion selection triggered)?
    if (this.coveredPiece === null) {
      this.lastX = x;
      this.lastY = y;

      this.turn++;
      this.turnShowing = this.turn;
    } else {
      this.promotingX = x;
      this.promotingY = y;
    }

    if (clearFrom) {
      // If the cell where the piece is coming from is different
      // from the cell where the promotion candidate is going to be shown,
      // the original cell must be marked as empty.
      this.board[fromY][fromX].piece.type = KARA;
      this.board[fromY][fromX].piece.promoted = false;
    } else {
      // If the cell where the piece is coming from is,
      // the same cell as the cell where the promotion candidate is going to be shown,
      // there is no need to keep the coverred piece.
      this.coveredPiece.type = KARA;
      this.coveredPiece.promoted = false;
    }

    this.unselect();
  }
}


const game = new Game();


const init = () => {
  // Prepare HTML elements for the board

  const body = document.getElementsByTagName('body')[0];
  body.onpointerdown = () => {
    unselectHoldingPiece();
  };

  const board = document.getElementById("ban");
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.onpointerdown = (event) => {
        // Stop unselectHoldingPiece from firing when you click a cell.
        event.stopPropagation();
        ondown(x, y);
      };
      board.appendChild(cell);
      game.board[y][x].cellElement = cell;

      const piece = document.createElement("div");
      piece.className = "piece";
      game.board[y][x].pieceElement = piece;
      cell.appendChild(piece);
    }
  }

  const createPieceInHand = (pieceId, isPlayer) => {
    const div = document.createElement("div");
    div.innerText = pieceTypeToChar(pieceId);
    div.classList.add("piece-in-hand");
    div.onmousedown = (event) => {
      // Stop unselectHoldingPiece from firing when you click a cell.
      event.stopPropagation();
      selectPieceInHand(pieceId, isPlayer);
    }
    const sub = document.createElement("sub");
    if (isPlayer) {
      sub.id = `player-num-piece-${pieceId}`;
    } else {
      sub.id = `opponent-num-piece-${pieceId}`;
    }
    div.append(sub);
    return div;
  };

  const opponentKoma = document.getElementById("opponent-pieces");
  const playerKoma   = document.getElementById("player-pieces");
  for (let i = 0; i < 8; i++) {
    const piece = createPieceInHand(i, false);
    game.opponentPiecesInHand[i].pieceElement = piece;
    opponentKoma.append(piece);
  }
  for (let i = 0; i < 8; i++) {
    const piece = createPieceInHand(i, true);
    game.playerPiecesInHand[i].pieceElement = piece;
    playerKoma.append(piece);
  }

  // Configure control board
  const prevButton = document.getElementById("prev-button");
  const nextButton = document.getElementById("next-button");
  prevButton.onmousedown = (event) => {
    event.preventDefault();
    event.stopPropagation();
    showPrev();
  };
  nextButton.onmousedown = (event) => {
    event.preventDefault();
    event.stopPropagation();
    showNext();
  };

  const saveButton = document.getElementById("save-button");
  saveButton.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    onsave();
  };

  const modalBackground = document.getElementById("modal-background");
  modalBackground.onpointerdown = (event) => {
    event.preventDefault();
    event.stopPropagation();

    closeSaveModal();
  };

  const modalCloseButton = document.getElementById("modal-close-button");
  modalCloseButton.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    closeSaveModal();
  };

  const kifTitle = document.getElementById("kif-title");
  kifTitle.onpointerdown = (event) => {
    event.stopPropagation();
  }

  const saveKifButton = document.getElementById("modal-save-kif-button");
  saveKifButton.onpointerdown = (event) => {
    event.preventDefault();
    event.stopPropagation();

    // TODO: Send to server
    const kifu = game.kifu.dump();
    console.log(kifu);
  }

  showBoard();
};


const ondown = (x, y) => {
  switch (game.state) {
    case FIRST_MOVE:
    case PLAYER_SELECTING:
    case OPPONENT_SELECTING:
      selectPiece(x, y);
      break;
    case PLAYER_HOLDING_PIECE:
    case OPPONENT_HOLDING_PIECE:
      movePiece(x, y);
      break;
    case SELECT_PROMOTION:
      selectPromotion(x, y);
      break;
  }

  showBoard();
};


const unselectHoldingPiece = () => {
  if (game.state === PLAYER_HOLDING_PIECE || game.state === OPPONENT_HOLDING_PIECE) {
    game.unselect();
    if (game.turn === 1) {
      game.state = FIRST_MOVE;
    } else if (game.state === PLAYER_HOLDING_PIECE) {
      game.state = PLAYER_SELECTING;
    } else {
      game.state = OPPONENT_SELECTING;
    }
    showBoard();
  }
};


const selectPieceInHand = (pieceId, isPlayer) => {
  if (!(game.state === PLAYER_SELECTING || game.state === OPPONENT_SELECTING)) {
    return;
  }

  if (game.isReplaying) {
    if (window.confirm("現在の棋譜を上書きしますか？")) {
      game.isReplaying = false;
      game.savedState = null;
      game.turn = game.turnShowing;
    } else {
      return;
    }
  }

  if ((isPlayer && game.state !== PLAYER_SELECTING) || (!isPlayer && game.state !== OPPONENT_SELECTING)) {
    return;
  }
  if (isPlayer && game.playerPiecesInHand[pieceId].num === 0) {
    return;
  }
  if (!isPlayer && game.opponentPiecesInHand[pieceId].num === 0) {
    return;
  }
  game.inHandPieceId = pieceId;
  game.inHandIsPlayer = isPlayer;
  game.inHandIsOpponent = !isPlayer;

  if (game.state === PLAYER_SELECTING) {
    game.state = PLAYER_HOLDING_PIECE;
  } else {
    game.state = OPPONENT_HOLDING_PIECE;
  }
  showBoard();
}


const selectPiece = (selectX, selectY) => {
  if (!(game.state === FIRST_MOVE || game.checkOwnership(selectX, selectY))) {
    return;
  }

  if (game.isReplaying) {
    if (window.confirm("現在の棋譜を上書きしますか？")) {
      game.isReplaying = false;
      game.savedState = null;
      game.turn = game.turnShowing;
    } else {
      return;
    }
  }

  game.select(selectX, selectY);

  if (game.state === PLAYER_SELECTING) {
    game.state = PLAYER_HOLDING_PIECE;
  } else if (game.state === OPPONENT_SELECTING) {
    game.state = OPPONENT_HOLDING_PIECE;
  } else if (game.state === FIRST_MOVE) {
    if (game.board[selectY][selectX].piece.owner === PLAYER) {
      game.state = PLAYER_HOLDING_PIECE;
    } else {
      game.state = OPPONENT_HOLDING_PIECE;
    }
  }
};


const movePiece = (nextX, nextY) => {
  // TODO: Check if the selected piece is capable of moving to nextX, nextY
  if (game.checkOwnership(nextX, nextY)) {
    game.unselect();
    if (game.state === PLAYER_HOLDING_PIECE) {
      game.state = PLAYER_SELECTING;
    } else {
      game.state = OPPONENT_SELECTING;
    }
    return;
  }

  game.moveTo(nextX, nextY);

  if (game.coveredPiece !== null) {
    game.state = SELECT_PROMOTION;
  } else if (game.state === PLAYER_HOLDING_PIECE) {
    game.state = OPPONENT_SELECTING;
  } else {
    game.state = PLAYER_SELECTING;
  }
};


const selectPromotion = (x, y) => {
  const promotingX = game.promotingX;
  const promotingY = game.promotingY;

  const isPlayerTurn = game.board[promotingY][promotingX].piece.owner === PLAYER;
  if (isPlayerTurn) {
    if (!((x === promotingX && y === promotingY) || (x === promotingX && y === (promotingY + 1)))) {
      // Has clicked somewhere else
      return;
    }

    if (x === promotingX && y === (promotingY + 1)) {
      game.board[promotingY][promotingX].piece.promoted = true;
    }

    game.board[promotingY + 1][x].piece = game.coveredPiece;
  } else {
    if (!((x === promotingX && y === promotingY) || (x === promotingX && y === (promotingY - 1)))) {
      return;
    }

    if (x === promotingX && y === (promotingY - 1)) {
      game.board[promotingY][promotingX].piece.promoted = true;
    }

    game.board[promotingY - 1][x].piece = game.coveredPiece;
  }

  // Pop the last move and config it so that it includes the promotion information
  let move = game.kifu.popMove();
  move = Object.assign(move, { promote: game.board[promotingY][promotingX].piece.promoted });
  game.kifu.addMove(move.turn, game.board[promotingY][promotingX].piece.owner,
    move.fromX, move.fromY, move.toX, move.toY,
    move.piece, move.promote, move.fromInHand, move.takePieceId, move.takePiecePromoted);

  game.turn++;
  game.turnShowing = game.turn;

  game.lastX = promotingX;
  game.lastY = promotingY;

  game.promotingX = -1;
  game.promotingY = -1;
  game.coveredPiece = null;

  if (isPlayerTurn) {
    game.state = OPPONENT_SELECTING;
  } else {
    game.state = PLAYER_SELECTING;
  }
};


const showBoard = () => {
  let [selectedX, selectedY] = game.selected;
  // Draw board
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const now = game.board[y][x];

      const character = pieceToChar(game.board[y][x].piece);
      game.board[y][x].pieceElement.innerText = character;

      if (selectedX === x && selectedY === y) {
        now.cellElement.classList.add('selected');
      } else if (now.cellElement.classList.contains('selected') !== -1) {
        now.cellElement.classList.remove('selected');
      }

      if (now.piece.owner === OPPONENT) {
        now.pieceElement.classList.add('opponent');
      } else if (now.pieceElement.classList.contains('opponent') !== -1) {
        now.pieceElement.classList.remove('opponent');
      }

      if (now.piece.promoted) {
        now.pieceElement.classList.add('promoted');
      } else if (!now.piece.promoted && now.pieceElement.classList.contains('promoted')) {
        now.pieceElement.classList.remove('promoted');
      }

      if (x === game.lastX && y === game.lastY) {
        now.cellElement.classList.add('last-touched');
      } else if (!(x === game.lastX && y === game.lastY) && now.cellElement.classList.contains('last-touched')) {
        now.cellElement.classList.remove('last-touched');
      }
    }
  }

  // Draw piece stand
  for (let i = 0; i < 8; i++) {
    if (game.inHandIsPlayer && i === game.inHandPieceId) {
      game.playerPiecesInHand[game.inHandPieceId].pieceElement.classList.add("selected-in-hand");
    } else if (game.playerPiecesInHand[i].pieceElement.classList.contains("selected-in-hand")) {
      game.playerPiecesInHand[i].pieceElement.classList.remove("selected-in-hand");
    }
    if (game.inHandIsOpponent && i === game.inHandPieceId) {
      game.opponentPiecesInHand[game.inHandPieceId].pieceElement.classList.add("selected-in-hand");
    } else if (game.opponentPiecesInHand[i].pieceElement.classList.contains("selected-in-hand")) {
      game.opponentPiecesInHand[i].pieceElement.classList.remove("selected-in-hand");
    }
  }
  for (let pieceType = 0; pieceType < 8; pieceType++) {
    const num = game.opponentPiecesInHand[pieceType].num;
    const pieceNum = document.getElementById(`opponent-num-piece-${pieceType}`);
    pieceNum.innerText = num;
  }
  for (let pieceType = 0; pieceType < 8; pieceType++) {
    const num = game.playerPiecesInHand[pieceType].num;
    const pieceNum = document.getElementById(`player-num-piece-${pieceType}`);
    pieceNum.innerText = num;
  }

  // Configure control board
  const prevButton = document.getElementById("prev-button");
  const nextButton = document.getElementById("next-button");

  if (game.turnShowing === 1) {
    prevButton.classList.add("disabled-button");
  } else if (game.turnShowing !== 1 && prevButton.classList.contains("disabled-button")) {
    prevButton.classList.remove("disabled-button");
  }
  if (game.turnShowing === game.kifu.moves.length + 1 || game.promotingX !== -1) {
    nextButton.classList.add("disabled-button");
  } else if (game.turnShowing !== game.kifu.moves.length + 1 && nextButton.classList.contains("disabled-button")) {
    nextButton.classList.remove("disabled-button");
  }
};


const showPrev = () => {
  if (game.turnShowing === 1 || !(game.state === PLAYER_SELECTING || game.state === OPPONENT_SELECTING)) {
    console.log("Cannot show previous move now.");
    return;
  }

  if (!game.isReplaying) {
    game.isReplaying = true;
    game.savedState = game.state;
  }

  const prevMove = game.kifu.getMove(game.turnShowing - 1);
  const turn = prevMove.turn;
  const owner = prevMove.owner;
  const fromX = transFromKifX(prevMove.fromX);
  const fromY = transFromKifY(prevMove.fromY);
  const toX = transFromKifX(prevMove.toX);
  const toY = transFromKifY(prevMove.toY);
  const piece = prevMove.piece;
  const promote = prevMove.promote;
  const fromInHand = prevMove.fromInHand;
  const takePieceId = prevMove.takePieceId;
  const takePiecePromoted = prevMove.takePiecePromoted;

  const [pieceId, promoted] = pieceCharToIdPromoted(piece);

  if (!fromInHand) {
    game.board[fromY][fromX].piece.type = pieceId;
    game.board[fromY][fromX].piece.owner = owner;
    game.board[fromY][fromX].piece.promoted = promoted;
    if (promote) {
      // If this move is a promotion, the previous piece should not be promoted
      game.board[fromY][fromX].piece.promoted = false;
    }
  } else {
    if (owner === PLAYER) {
      game.playerPiecesInHand[pieceId].num++;
    } else {
      game.opponentPiecesInHand[pieceId].num++;
    }
  }

  if (takePieceId !== KARA) {
    game.board[toY][toX].piece.type = takePieceId;
    game.board[toY][toX].piece.owner = owner === PLAYER ? OPPONENT : PLAYER;
    game.board[toY][toX].piece.promoted = takePiecePromoted;
    if (owner === PLAYER) {
      game.playerPiecesInHand[takePieceId].num--;
    } else {
      game.opponentPiecesInHand[takePieceId].num--;
    }
  } else {
    game.board[toY][toX].piece.type = KARA;
  }

  if (turn === 1) {
    game.lastX = -1;
    game.lastY = -1;
  } else {
    const prevPrev = game.kifu.getMove(turn - 1);
    game.lastX = transFromKifX(prevPrev.toX);
    game.lastY = transFromKifY(prevPrev.toY);
  }

  game.state = game.state === PLAYER_SELECTING ? OPPONENT_SELECTING : PLAYER_SELECTING;

  game.turnShowing--;

  showBoard();
};


const showNext = () => {
  if (game.turnShowing === game.turn || !(game.state === PLAYER_SELECTING || game.state === OPPONENT_SELECTING)) {
    console.log("Cannot show next move now.");
    return;
  }

  const nextMove = game.kifu.getMove(game.turnShowing);
  const turn = nextMove.turn;
  const owner = nextMove.owner;
  const fromX = transFromKifX(nextMove.fromX);
  const fromY = transFromKifY(nextMove.fromY);
  const toX = transFromKifX(nextMove.toX);
  const toY = transFromKifY(nextMove.toY);
  const piece = nextMove.piece;
  const promote = nextMove.promote;
  const fromInHand = nextMove.fromInHand;
  const takePieceId = nextMove.takePieceId;
  const takePiecePromoted = nextMove.takePiecePromoted;

  const [pieceId, promoted] = pieceCharToIdPromoted(piece);

  if (fromInHand) {
    if (owner === PLAYER) {
      game.playerPiecesInHand[pieceId].num--;
    } else {
      game.opponentPiecesInHand[pieceId].num--;
    }
  }

  if (!fromInHand) {
    game.board[fromY][fromX].piece.type = KARA;
    game.board[fromY][fromX].piece.promoted = false;
  }

  game.board[toY][toX].piece.type = pieceId;
  game.board[toY][toX].piece.owner = owner;
  game.board[toY][toX].piece.promoted = promoted || promote;

  if (takePieceId !== KARA) {
    if (owner === PLAYER) {
      game.playerPiecesInHand[takePieceId].num++;
    } else {
      game.opponentPiecesInHand[takePieceId].num++;
    }
  }

  game.lastX = toX;
  game.lastY = toY;

  game.turnShowing++;
  game.state = game.state === PLAYER_SELECTING ? OPPONENT_SELECTING : PLAYER_SELECTING;

  if (game.turnShowing === game.turn) {
    game.isReplaying = false;
    game.state = game.savedState;
    game.savedState = null;
  }

  showBoard();
};


const onsave = () => {
  const modalBackground = document.getElementById("modal-background");
  const modalContent = document.getElementById("modal-content");
  modalBackground.style.display = "block";
  modalContent.style.display = "flow";
};


const closeSaveModal = () => {
  const modalBackground = document.getElementById("modal-background");
  const modalContent = document.getElementById("modal-content");
  modalBackground.style.display = "none";
  modalContent.style.display = "none";
};


const pieceToChar = (piece) => {
  switch (piece.type) {
    case KARA:
      return "";
    case FU:
      if (piece.promoted)
        return "と";
      else
        return "歩";
    case KYOU:
      if (piece.promoted)
        return "杏";
      else
        return "香";
    case KEI:
      if (piece.promoted)
        return "圭";
      else
        return "桂";
    case GIN:
      if (piece.promoted)
        return "全";
      else
        return "銀";
    case KIN:
      return "金";
    case KAKU:
      if (piece.promoted)
        return "馬";
      else
        return "角";
    case HISHA:
      if (piece.promoted)
        return "龍";
      else
        return "飛";
    case GYOKU:
      return "玉"
  }
}


const pieceTypeToChar = (pieceType) => {
  switch (pieceType) {
    case KARA:
      return "";
    case FU:
      return "歩";
    case KYOU:
      return "香";
    case KEI:
      return "桂";
    case GIN:
      return "銀";
    case KIN:
      return "金";
    case KAKU:
      return "角";
    case HISHA:
      return "飛";
    case GYOKU:
      return "玉"
  }
}


const pieceCharToIdPromoted = (pieceChar) => {
  switch (pieceChar) {
    case "歩":
      return [FU, false];
    case "と":
      return [FU, true];
    case "香":
      return [KYOU, false];
    case "杏":
      return [KYOU, true];
    case "桂":
      return [KEI, false];
    case "圭":
      return [KEI, true];
    case "銀":
      return [GIN, false];
    case "全":
      return [GIN, true];
    case "金":
      return [KIN, false];
    case "角":
      return [KAKU, false];
    case "馬":
      return [KAKU, true];
    case "飛":
      return [HISHA, false];
    case "龍":
      return [HISHA, true];
    case "玉":
      return [GYOKU, false];
  }
}


const transToKifX = (x) => {
  // In this script, the origin is the top-left corner.
  // Transform the coordinate so that it will start from the top-right corner,
  // which is the standard in shogi.
  return 9 - x;
}


const transToKifY = (y) => {
  return y + 1;
}


const transFromKifX = (x) => {
  return 9 - x;
}


const transFromKifY = (y) => {
  return y - 1;
}
