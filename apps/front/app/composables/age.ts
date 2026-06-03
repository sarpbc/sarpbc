export const getAgeFromBirthday = (birthday: Date) => {
  const age = Math.floor((Date.now() - birthday.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return age > 0 ? age : "-";
};
