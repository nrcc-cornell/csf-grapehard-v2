// Inputs: arr- Array, targetLength- number, fillValue- any value valid to place in an Array, append- optional, boolean, defaults to true
// Adds targetLength number of fillValue to beginning or end (determined by optional append bollean) of arr
export function fillWith(arr, targetLength, fillValue, append=true) {
  const diff = targetLength - arr.length;
  if (diff <= 0) return arr;

  const newPortion = new Array(diff).fill(fillValue);
  return append ? arr.concat(newPortion) : newPortion.concat(arr);
}