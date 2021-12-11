//
// I made this for fun after a night of no sleep. Neither the code nor the HTML is very pretty ;-)
//

ChargeNode = function () {
  this.x = 0;
  this.y = 0;
  this.xPos = 0;
  this.yPos = 0;
  this.toNode = null;
  this.fromNodes = [];
  this.potentialLinks = [];
  this.potentialLinksLeft = [];
  this.charge = 1;
  this.discharged = false;
};

function createNodes(xPosOffset, yPosOffset, xCount, yCount, spacing) {
  var nodes = [];
  var halfspacing = spacing / 2;

  var x, y;
  for (x = 0; x < xCount; x++) {
    nodes[x] = [];
    for (y = 0; y < yCount; y++) {
      var node = new ChargeNode();
      node.x = x;
      node.y = y;
      node.xPos =
        xPosOffset + x * spacing + Math.random() * spacing - halfspacing;
      node.yPos =
        yPosOffset + y * spacing + Math.random() * spacing - halfspacing;
      nodes[x][y] = node;
    }
  }

  return nodes;
}

function preLinkNodes(nodes) {
  var ix, iy;
  var lastX, lastY;

  lastX = nodes.length - 1;
  lastY = nodes[0].length - 1;
  a = nodes;
  for (ix in nodes) {
    ix = Number(ix); // Bleh, they are strings by default.
    for (iy in nodes[ix]) {
      iy = Number(iy);
      var node = nodes[ix][iy];
      if (ix > 0) {
        if (iy > 0) {
          node.potentialLinks.push(nodes[ix - 1][iy - 1]); // NW
        }
        node.potentialLinks.push(nodes[ix - 1][iy]); // W
        if (iy < lastY) {
          node.potentialLinks.push(nodes[ix - 1][iy + 1]); // SW
        }
      }
      if (iy > 0) {
        node.potentialLinks.push(nodes[ix][iy - 1]); // N
      }
      if (iy < lastY) {
        node.potentialLinks.push(nodes[ix][iy + 1]); // S
      }
      if (ix < lastX) {
        if (iy > 0) {
          node.potentialLinks.push(nodes[ix + 1][iy - 1]); // NE
        }
        node.potentialLinks.push(nodes[ix + 1][iy]); // E
        if (iy < lastY) {
          node.potentialLinks.push(nodes[ix + 1][iy + 1]); // SE
        }
      }
    }
  }
}

function linkNodes(nodes, x, y) {
  var ix, iy;

  for (ix in nodes) {
    for (iy in nodes[ix]) {
      var node = nodes[ix][iy];

      node.fromNodes = [];
      node.toNode = null;

      // Make a copy of the potential links list. We destroy the copy bit by bit below.
      node.potentialLinksLeft = node.potentialLinks.slice(0);
    }
  }

  // Discharge the contact node.
  nodes[x][y].discharged = true;

  var activeNodes = [];
  activeNodes.push(nodes[x][y]);
  while (activeNodes.length > 0) {
    var node = activeNodes.splice(
      Math.floor(Math.random() * activeNodes.length),
      1
    )[0];

    var madeLink = false;
    while (node.potentialLinksLeft.length > 0) {
      var potentialLink = node.potentialLinksLeft.splice(
        Math.floor(Math.random() * node.potentialLinksLeft.length),
        1
      )[0];
      if (potentialLink.discharged) continue;
      potentialLink.discharged = true;
      potentialLink.toNode = node;
      node.fromNodes.push(potentialLink);
      activeNodes.push(potentialLink);
      madeLink = true;
      break;
    }

    if (madeLink) {
      // Have a look at this node again some time later.
      activeNodes.push(node);
    } // If no links were made then all surrounding nodes have been discharged, so this node doesn't have to be active anymore. Just forget about it.
  }
}

function processChargeAux(node) {
  var ix;

  for (ix in node.fromNodes) {
    node.charge += processChargeAux(node.fromNodes[ix]);
  }
  return node.charge;
}

function processCharge(node) {
  var ix,
    subcharge,
    maxsubcharge = 0;

  for (ix in node.fromNodes) {
    subcharge = processChargeAux(node.fromNodes[ix]);
    maxsubcharge = Math.max(subcharge, maxsubcharge);
    node.charge += subcharge;
  }
  return maxsubcharge;
}

function gatherLines(nodes, maxCharge) {
  var lines = [];
  var ix, iy;

  // Lower pulls everything towards bright.
  // Lose definition around 1/30
  // range: 1/30 -> 2.6
  const brightnessFactor = 1 / 4;

  // Lower shows more smaller bits.
  // range: 0.000005 (tons of streaks) -> 0.5 (no streaks)
  var cutoff = 0.000005;
  var emphasize = brightnessFactor;

  for (ix in nodes) {
    for (iy in nodes[ix]) {
      var node = nodes[ix][iy];
      if (node.toNode) {
        lines.push([
          node.xPos,
          node.yPos,
          node.toNode.xPos,
          node.toNode.yPos,
          Math.min(
            1,
            Math.pow(Math.max(0, node.charge / maxCharge - cutoff), emphasize)
          ),
        ]);
      }
    }
  }
  lines.sort(function (a, b) {
    return a[4] - b[4];
  });
  return lines;
}

function drawLines(lines, ctx, r, g, b, a, w) {
  for (ix in lines) {
    var line = lines[ix];
    ctx.lineWidth = 2 * w * line[4];
    //        ctx.strokeStyle = "rgb(" + (Math.round(r * line[4])) + "," + (Math.round(g * line[4])) + "," + (Math.round(b * line[4])) + ")";
    ctx.strokeStyle = "rgba(" + r + "," + g + "," + b + "," + a * line[4] + ")";
    ctx.beginPath();
    ctx.moveTo(line[0], line[1]);
    ctx.lineTo(line[2], line[3]);
    ctx.stroke();
  }
}

window.draw = () => {
  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");

  // var grad = ctx.createRadialGradient(500, 800, 0, 500, 800, 1200);
  // grad.addColorStop(0, "#0352AE");
  // //    grad.addColorStop(0.5, "blue");
  // grad.addColorStop(1, "black");
  // ctx.fillStyle = grad;
  // ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  var nodeCount = 300;
  var xNodeCount = nodeCount;
  var yNodeCount = nodeCount;
  var nodeSpacing = canvas.width / (xNodeCount - 1);
  var nodes = createNodes(0, 0, xNodeCount, yNodeCount, nodeSpacing);
  preLinkNodes(nodes);

  // Don't need an initial charge.
  var x = Math.round(xNodeCount / 2);
  var y = 3;
  linkNodes(nodes, x, y);
  var maxSubCharge = processCharge(nodes[x][y]);
  var lines = gatherLines(nodes, maxSubCharge);

  drawLines(lines, ctx, 35, 35, 80, 0.05, 11);
  drawLines(lines, ctx, 35, 35, 255, 0.3, 7);
  drawLines(lines, ctx, 135, 135, 255, 0.8, 4);
  drawLines(lines, ctx, 220, 220, 255, 1, 2);
};
