import * as THREE from "three";
import * as dat from "lil-gui";
import "./style.css";

// // Canvas
// const canvas = document.querySelector("canvas.webgl");

// // Scene
// const scene = new THREE.Scene();

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

// /**
//  * Renderer
//  */
// const renderer = new THREE.WebGLRenderer({
//   canvas,
// });
// renderer.setSize(sizes.width, sizes.height);
// renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const params = {
  nodeCount: 300,
  xPosOffset: 0,
  yPosOffset: 0,
  // Lower pulls everything towards bright.
  // Lose definition around 1/30
  // range: 1/30 -> 2.6
  brightnessFactor: 1 / 4,
  // Lower shows more smaller bits.
  // range: 0.000005 (tons of streaks) -> 0.5 (no streaks)
  cutoff: 0.000005,
};

const gui = new dat.GUI();
gui
  .add(params, "nodeCount")
  .min(1)
  .max(4000)
  .step(1)
  .onFinishChange(generateLichtenberg());
gui
  .add(params, "xPosOffset")
  .min(-2000)
  .max(2000)
  .step(1)
  .onFinishChange(generateLichtenberg());
gui
  .add(params, "yPosOffset")
  .min(-2000)
  .max(2000)
  .step(1)
  .onFinishChange(generateLichtenberg());
gui
  .add(params, "brightnessFactor")
  .min(1 / 30)
  .max(2.6)
  .step(0.01)
  .onFinishChange(generateLichtenberg());
gui
  .add(params, "cutoff")
  .min(0.000005)
  .max(0.5)
  .step(0.00001)
  .onFinishChange(generateLichtenberg());

const ChargeNode = function () {
  this.gridPos = new THREE.Vector2(0, 0);
  this.position = new THREE.Vector2(0, 0);
  this.toNode = null;
  this.fromNodes = [];
  this.potentialLinks = [];
  this.potentialLinksLeft = [];
  this.charge = 1;
  this.discharged = false;
};

function createNodes(xPosOffset, yPosOffset, xCount, yCount, spacing) {
  const nodes = [];
  const halfSpacing = spacing / 2;

  for (let x = 0; x < xCount; x++) {
    nodes[x] = [];
    for (let y = 0; y < yCount; y++) {
      const node = new ChargeNode();
      node.gridPos.set(x, y);
      node.position.set(
        xPosOffset + x * spacing + Math.random() * spacing - halfSpacing,
        yPosOffset + y * spacing + Math.random() * spacing - halfSpacing
      );
      nodes[x][y] = node;
    }
  }

  return nodes;
}

function preLinkNodes(nodes) {
  const lastX = nodes.length - 1;
  const lastY = nodes[0].length - 1;

  for (let ix = 0; ix < nodes.length; ix++) {
    for (let iy = 0; iy < nodes[ix].length; iy++) {
      const node = nodes[ix][iy];
      // not against the left border
      if (ix > 0) {
        // not against the top border
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
  for (let ix in nodes) {
    for (let iy in nodes[ix]) {
      let node = nodes[ix][iy];

      node.fromNodes = [];
      node.toNode = null;

      // Make a copy of the potential links list. We destroy the copy bit by bit below.
      node.potentialLinksLeft = node.potentialLinks.slice(0);
    }
  }

  // Discharge the contact node.
  nodes[x][y].discharged = true;

  let activeNodes = [];
  activeNodes.push(nodes[x][y]);
  while (activeNodes.length > 0) {
    let node = activeNodes.splice(
      Math.floor(Math.random() * activeNodes.length),
      1
    )[0];

    let madeLink = false;
    while (node.potentialLinksLeft.length > 0) {
      let potentialLink = node.potentialLinksLeft.splice(
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
  for (let ix in node.fromNodes) {
    node.charge += processChargeAux(node.fromNodes[ix]);
  }
  return node.charge;
}

function processCharge(node) {
  let subcharge,
    maxsubcharge = 0;

  for (let ix in node.fromNodes) {
    subcharge = processChargeAux(node.fromNodes[ix]);
    maxsubcharge = Math.max(subcharge, maxsubcharge);
    node.charge += subcharge;
  }
  return maxsubcharge;
}

function gatherLines(nodes, maxCharge) {
  const lines = [];

  for (let ix in nodes) {
    for (let iy in nodes[ix]) {
      let node = nodes[ix][iy];
      if (node.toNode) {
        lines.push([
          node.position.x,
          node.position.y,
          node.toNode.position.x,
          node.toNode.position.y,
          Math.min(
            1,
            Math.pow(
              Math.max(0, node.charge / maxCharge - params.cutoff),
              params.brightnessFactor
            )
          ),
        ]);
      }
    }
  }
  // lines.sort(function (a, b) {
  //   return a[4] - b[4];
  // });
  return lines;
}

function drawLines(lines, ctx, r, g, b, a, w) {
  for (let ix in lines) {
    let line = lines[ix];
    ctx.lineWidth = 2 * w * line[4];
    //        ctx.strokeStyle = "rgb(" + (Math.round(r * line[4])) + "," + (Math.round(g * line[4])) + "," + (Math.round(b * line[4])) + ")";
    ctx.strokeStyle = "rgba(" + r + "," + g + "," + b + "," + a * line[4] + ")";
    ctx.beginPath();
    ctx.moveTo(line[0], line[1]);
    ctx.lineTo(line[2], line[3]);
    ctx.stroke();
  }
}

function generateLichtenberg() {
  let canvas = document.getElementById("canvas");
  let ctx = canvas.getContext("2d");

  return function () {
    console.log("Generating...");
    ctx.clearRect(0, 0, canvas.width, canvas.height); //clear html5 canvas

    console.time();

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const xNodeCount = params.nodeCount;
    const yNodeCount = params.nodeCount;
    const nodeSpacing = canvas.width / (xNodeCount - 1);
    const nodes = createNodes(
      params.xPosOffset,
      params.yPosOffset,
      xNodeCount,
      yNodeCount,
      nodeSpacing
    );
    preLinkNodes(nodes);

    const x = Math.round(xNodeCount / 2);
    const y = 3;
    linkNodes(nodes, x, y);
    const maxSubCharge = processCharge(nodes[x][y]);
    const lines = gatherLines(nodes, maxSubCharge);

    // drawLines(lines, ctx, 35, 35, 80, 0.05, 11);
    drawLines(lines, ctx, 35, 35, 255, 0.3, 7);
    // drawLines(lines, ctx, 135, 135, 255, 0.8, 4);
    drawLines(lines, ctx, 220, 220, 255, 1, 2);

    console.timeEnd();
  };
}

window.generateLichtenberg = generateLichtenberg();

// Three stuff

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  // camera.aspect = sizes.width / sizes.height;
  // camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
