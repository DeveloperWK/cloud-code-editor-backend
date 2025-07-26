const runningPlaygroundContainers = new Set<{
  name: string;
  containerID: string;
}>();

export default runningPlaygroundContainers;
