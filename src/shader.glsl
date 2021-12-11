// struct Light
// {
//   vec3 eyePosOrDir;
//   bool isDirectional;
//   vec3 intensity;
//   float attenuation;
// } variableName;

struct ChargeNodeState {
  float x;
  float y;
  float xPos;
  float yPos;
  int charge;
  bool discharged;
}

struct ChargeNodeLink {
  // toNode;
  // [] fromNodes;
  // [] potentialLinks;
  // [] potentialLinksLeft;
}