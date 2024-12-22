let heightSlider;
let widthSlider;

let startingPointPosition;
let collisionPointPosition;
let guessPointPosition;
let isDragging = false;

let taskContainers = [];


const taskButtons = [];
const taskDescriptions = [
  "Imposta il punto d'inizio",
  "Imposta il punto di collisione",
  "Indovina il punto finale",
];
let activeTaskIndex = 0;

const ellipseInitialWidth = 350;
const ellipseInitialHeight = 200;

window.addEventListener("resize", draw);

function onTaskPressed(index) {
  activeTaskIndex = index;
  if (activeTaskIndex === 1) {
    collisionPointPosition = {
      x: window.innerWidth / 2,
      y: (window.innerHeight / 2) - (ellipseInitialHeight / 2),
    };
  } else if (activeTaskIndex === 2) {
    guessPointPosition = {
      x: window.innerWidth / 2,
      y: (window.innerHeight / 2) - (ellipseInitialHeight / 2),
    };
  }
  showGuessPoint = false;
}

function getCurrentPoint() {
  return [startingPointPosition, collisionPointPosition, guessPointPosition, {}][activeTaskIndex];
}

/**
 * @typedef {Object} Point
 * @property {number} x - The x coordinate.
 * @property {number} y - The y coordinate.
 */

/**
 * @typedef {Object} UnitVector
 * @property {number} x - The x component.
 * @property {number} y - The y component.
 */

/**
 * @typedef {Object} Ellipse
 * @property {number} cx - The x coordinate of the center.
 * @property {number} cy - The y coordinate of the center.
 * @property {number} rx - The horizontal radius.
 * @property {number} ry - The vertical radius.
 */

const githubLogoSVG = `<svg width="24" height="24" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z" transform="scale(64)" fill="#1B1F23"/>
</svg>`;

/**
 * Check if a point is inside an ellipse
 * @param {Point} point - The point to check {x, y}.
 * @param {Ellipse} ellipse - The ellipse definition {cx, cy, rx, ry}.
 * @returns {boolean} - True if the point is inside the ellipse, false otherwise.
 */
function isPointInsideEllipse(point, ellipse) {
  const { x, y } = point;
  const { cx, cy, rx, ry } = ellipse;

  // Ellipse equation: ((x - cx)^2 / rx^2) + ((y - cy)^2 / ry^2) <= 1
  return (
    Math.pow(x - cx, 2) / Math.pow(rx, 2) +
      Math.pow(y - cy, 2) / Math.pow(ry, 2) <=
    1
  );
}

/**
 * Calculate the direction of a line bouncing off the ellipse.
 *
 * @param {Array} point1 - The starting point [x1, y1].
 * @param {Array} point2 - The point where the line intersects the ellipse [x2, y2].
 * @param {number} a - Semi-major axis of the ellipse.
 * @param {number} b - Semi-minor axis of the ellipse.
 * @returns {Array} A unit vector [vx, vy] representing the direction after the bounce.
 */
function ellipseBounce(point1, point2, a, b) {
  // Blatanly copied from ChatGPT
  const [x1, y1] = point1;
  const [x2, y2] = point2;

  // Calculate the normal vector at (x2, y2) on the ellipse
  let normalX = (2 * x2) / (a ** 2);
  let normalY = (2 * y2) / (b ** 2);
  let normalMagnitude = Math.sqrt(normalX ** 2 + normalY ** 2);
  let normal = [normalX / normalMagnitude, normalY / normalMagnitude];

  // Incoming vector from point1 to point2
  let incomingX = x2 - x1;
  let incomingY = y2 - y1;
  let incomingMagnitude = Math.sqrt(incomingX ** 2 + incomingY ** 2);
  let incoming = [incomingX / incomingMagnitude, incomingY / incomingMagnitude];

  // Reflect the incoming vector around the normal
  let dotProduct = incoming[0] * normal[0] + incoming[1] * normal[1];
  let reflectedX = incoming[0] - 2 * dotProduct * normal[0];
  let reflectedY = incoming[1] - 2 * dotProduct * normal[1];

  // Normalize the reflected vector to return a unit vector
  let reflectedMagnitude = Math.sqrt(reflectedX ** 2 + reflectedY ** 2);
  let reflected = [reflectedX / reflectedMagnitude, reflectedY / reflectedMagnitude];

  return reflected;
}

/**
 * Get intersection between a point and an ellipse if the point is outside.
 * It also works for points inside the ellipse, be sure to check if undesired.
 * @param {Point} point - The point {x, y}.
 * @param {Ellipse} ellipse - The ellipse definition {cx, cy, rx, ry}.
 * @returns {Point} - The intersection point {x, y}, or null if the point is inside the ellipse.
 */
function getIntersectionPoint(point, ellipse) {
  let { x, y } = point;
  let { cx, cy, rx, ry } = ellipse;

  if (rx === 0) {
    rx = 0.01;
  }

  if (ry === 0) {
    ry = 0.01;
  }

  // slope = dy / dx
  let dx = x - cx;
  let dy = y - cy;

  if (dx === 0) {
    dx = 0.01;
  }

  if (dy === 0) {
    dy = 0.01;
  }

  const scale = Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));

  const intersectionX = cx + dx / scale;
  const intersectionY = cy + dy / scale;

  return { x: intersectionX, y: intersectionY };
}

/**
 * Simulate the ball landing after a collision with an ellipse and returns the point where it lands.
 * @param {Point} startingPoint The starting point of the ball
 * @param {Point} collisionPoint The point in which the ball will collide with the table
 * @param {Ellipse} ellipse The ellipse
 * @returns {Point|null} The point in which the ball will land after the collision
 */
function simulateBallLanding(startingPoint, collisionPoint, ellipse) {
  const { x: x0, y: y0 } = startingPoint;
  const { x: x1, y: y1 } = collisionPoint;
  const { cx, cy, rx: a, ry: b } = ellipse;

  // Transform points to ellipse coordinates
  const startEllipse = { x: (x0 - cx) / a, y: (y0 - cy) / b };
  const collisionEllipse = { x: (x1 - cx) / a, y: (y1 - cy) / b };

  // Calculate the incoming vector in ellipse coordinates
  const incomingVector = {
      x: collisionEllipse.x - startEllipse.x,
      y: collisionEllipse.y - startEllipse.y
  };

  // Calculate the normal vector at the collision point
  const normalVector = {
      x: collisionEllipse.x / (a ** 2),
      y: collisionEllipse.y / (b ** 2)
  };

  // Normalize the normal vector
  const normalLength = Math.sqrt(normalVector.x ** 2 + normalVector.y ** 2);
  normalVector.x /= normalLength;
  normalVector.y /= normalLength;

  // Calculate the reflection vector
  const dotProduct =
      incomingVector.x * normalVector.x + incomingVector.y * normalVector.y;
  const reflectedVector = {
      x: incomingVector.x - 2 * dotProduct * normalVector.x,
      y: incomingVector.y - 2 * dotProduct * normalVector.y
  };

  // Normalize the reflected vector
  const reflectedLength = Math.sqrt(
      reflectedVector.x ** 2 + reflectedVector.y ** 2
  );
  const direction = {
      x: reflectedVector.x / reflectedLength,
      y: reflectedVector.y / reflectedLength
  };

  // Calculate intersection with ellipse
  const A =
      (direction.x ** 2) / a ** 2 + (direction.y ** 2) / b ** 2;
  const B =
      (2 * collisionEllipse.x * direction.x) / a ** 2 +
      (2 * collisionEllipse.y * direction.y) / b ** 2;
  const C =
      (collisionEllipse.x ** 2) / a ** 2 +
      (collisionEllipse.y ** 2) / b ** 2 -
      1;

  const discriminant = B ** 2 - 4 * A * C;
  if (discriminant < 0) {
      return null; // No intersection
  }

  const t1 = (-B + Math.sqrt(discriminant)) / (2 * A);
  const t2 = (-B - Math.sqrt(discriminant)) / (2 * A);

  const intersection1 = {
      x: collisionEllipse.x + direction.x * t1,
      y: collisionEllipse.y + direction.y * t1
  };
  const intersection2 = {
      x: collisionEllipse.x + direction.x * t2,
      y: collisionEllipse.y + direction.y * t2
  };

  // Filter out the collision point
  const isSamePoint = (p1, p2) =>
      Math.abs(p1.x - p2.x) < 1e-9 && Math.abs(p1.y - p2.y) < 1e-9;

  const landingEllipse = [intersection1, intersection2].filter(
      (point) => !isSamePoint(point, collisionEllipse)
  )[0];

  if (!landingEllipse) {
      return null;
  }

  // Transform back to viewport coordinates
  return {
      x: landingEllipse.x * a + cx,
      y: landingEllipse.y * b + cy
  };
}


function setup() {
  createCanvas(window.innerWidth, window.innerHeight);

  // Ellipse controls
  widthSlider = createSlider(100, window.innerWidth / 2, ellipseInitialWidth);
  widthSlider.position(10, 30);
  widthSlider.size(100);

  heightSlider = createSlider(100, window.innerHeight / 2, ellipseInitialHeight);
  heightSlider.position(10, 70);
  heightSlider.size(100);

  startingPointPosition = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  };
  collisionPointPosition = {
    x: window.innerWidth / 2,
    y: (window.innerHeight / 2) - (ellipseInitialHeight / 2),
  };

  // Point controls
  taskDescriptions.forEach((task, index) => {
    // Create a container for each task
    const taskContainer = createDiv("");
    taskContainer.position(10, 110 + index * 30);
    taskContainer.style("display", "flex");
    taskContainer.style("align-items", "center");
    taskContainer.style("cursor", "pointer");
    taskContainer.style("opacity", activeTaskIndex === index ? "1" : "0.5");

    // Create the dot element
    const dot = createDiv("•");
    dot.style("margin-right", "10px");
    dot.style("cursor", "pointer");
    taskContainer.child(dot);

    // Create the task description
    const taskDescription = createDiv(task);
    taskDescription.style("cursor", "pointer");
    taskContainer.child(taskDescription);

    // Add the click event to the container, dot, and description
    taskContainer.mousePressed(() => onTaskPressed(index));
    dot.mousePressed(() => onTaskPressed(index));
    taskDescription.mousePressed(() => onTaskPressed(index));

    taskContainers.push(taskContainer);
  });

  // See result button
  const seeResultButton = createButton("Vedi risultato");
  seeResultButton.position(10, 110 + taskDescriptions.length * 30);
  seeResultButton.mousePressed(() => {
    if(activeTaskIndex !== 2) {
      return;
    }
    activeTaskIndex = 3;
    // Draw the line between the guess point and the collision point
    stroke("purple");
    strokeWeight(2);
    line(
      collisionPointPosition.x,
      collisionPointPosition.y,
      guessPointPosition.x,
      guessPointPosition.y,
    );
  });

  // Github icon link
  const githubIcon = createA("https://github.com/nicolello-dev/elliptic-pool", githubLogoSVG, "_blank");
  githubIcon.size(32, 32);
  githubIcon.position(window.innerWidth - 24 * 2, window.innerHeight - 24 * 2);
}

function draw() {
  background(255);

  fill("black");
  noStroke();
  text("Width", 10, 20);
  text("Height", 10, 60);

  // Table
  fill("green");
  ellipse(
    window.innerWidth / 2,
    window.innerHeight / 2,
    widthSlider.value(),
    heightSlider.value(),
  );

  // Starting point
  fill("red");
  circle(startingPointPosition.x, startingPointPosition.y, 10);
  text("Inizio", startingPointPosition.x + 10, startingPointPosition.y);

  // Intersection point
  if(activeTaskIndex >= 1){
    fill("blue");
    circle(collisionPointPosition.x, collisionPointPosition.y, 10);
    text("Collisione", collisionPointPosition.x + 10, collisionPointPosition.y);
  }

  // The guess point isn't shown until the user clicks
  if (activeTaskIndex >= 2) {
    fill("purple");
    circle(guessPointPosition.x, guessPointPosition.y, 10);
    text("Fine", guessPointPosition.x + 10, guessPointPosition.y);
  }

  // Draw the line between the starting point and the collision point, and the actual end point
  if(activeTaskIndex >= 3) {
    stroke("red");
    strokeWeight(2);
    line(
      startingPointPosition.x,
      startingPointPosition.y,
      collisionPointPosition.x,
      collisionPointPosition.y,
    );

    stroke("purple");
    strokeWeight(2);
    line(
      collisionPointPosition.x,
      collisionPointPosition.y,
      guessPointPosition.x,
      guessPointPosition.y,
    );

    // Draw the ellipse bounce
    const a = widthSlider.value() / 2;
    const b = heightSlider.value() / 2;
    const endPoint = simulateBallLanding(
      startingPointPosition,
      collisionPointPosition,
      { cx: window.innerWidth / 2, cy: window.innerHeight / 2, rx: a, ry: b }
    );

    const { x: x2, y: y2 } = getIntersectionPoint(endPoint, { cx: window.innerWidth / 2, cy: window.innerHeight / 2, rx: a, ry: b });

    stroke("blue");
    strokeWeight(2);
    line(collisionPointPosition.x, collisionPointPosition.y, x2, y2);
  }

  taskContainers.forEach((taskContainer, index) => {
    taskContainer.style("opacity", activeTaskIndex === index ? "1" : "0.5");
  });
}

function mousePressed() {
  // Check if mouse is close to the point
  const point = getCurrentPoint(activeTaskIndex);
  if (
    !!point && dist(mouseX, mouseY, point.x, point.y) < 10
  ) {
    isDragging = true;
  }
}

function mouseDragged() {
  const mouse = {
    x: mouseX,
    y: mouseY,
  };
  const ellipse = {
    cx: window.innerWidth / 2,
    cy: window.innerHeight / 2,
    rx: widthSlider.value() / 2,
    ry: heightSlider.value() / 2,
  };
  const intersectionPoint = getIntersectionPoint(mouse, ellipse);

  const newPosition = {};

  if (isDragging) {
    // If the point is inside the ellipse, move it to the mouse position, else to its intersection point
    newPosition.x = isPointInsideEllipse(mouse, ellipse)
      ? mouseX
      : intersectionPoint.x;
    newPosition.y = isPointInsideEllipse(mouse, ellipse)
      ? mouseY
      : intersectionPoint.y;
    if (activeTaskIndex === 0) {
      startingPointPosition = newPosition;
    } else if (activeTaskIndex === 1) {
      collisionPointPosition = intersectionPoint;
    } else if (activeTaskIndex === 2) {
      guessPointPosition = intersectionPoint;
    }
  }
}

function mouseReleased() {
  isDragging = false;
}
