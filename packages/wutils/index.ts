const dateRegex =
  /(?<year>\d\d\d\d)-(?<month>\d\d)-(?<day>\d\d)T(?<hour>\d\d):(?<minute>\d\d):(?<second>\d\d)/;

export const invertDate = (date: string) => {
  const match = date.match(dateRegex);
  if (match?.groups === undefined) return undefined;

  const { year, month, day, hour, minute, second } = match.groups;
  const n = year + month + day + hour + minute + second;

  return n
    .split("")
    .map((x) => 9 - Number.parseInt(x))
    .join("");
};
