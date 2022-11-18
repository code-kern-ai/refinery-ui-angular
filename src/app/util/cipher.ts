//caution, this is not a save way to encrypt a string
//it is used to prevent directly readable strings 
//since this can easily be reversed with the logic it's not meant to store sensitive data

export const PASS_ME = stringToCaesarArray("KERN")

function stringToCaesarArray(pass: string): number[] {
    return pass.split('').map(x => x.charCodeAt(0));
}

export function caesarCipher(text: string, shift: number | number[], unCipher: boolean = false): string {
    if (typeof shift == 'number') {
        shift = [shift];
    }
    return text
        .split('')
        .map((char, idx) => {
            const charCode = char.charCodeAt(0);
            const shiftBy = shift[idx % (shift as number[]).length] * (unCipher ? -1 : 1);
            const newCharCode = shiftCharCodeAlphabet(charCode, shiftBy);
            if (newCharCode) return String.fromCharCode(newCharCode);
            else return char;
        })
        .join('');
}

function isLowerCase(charCode: number): boolean {
    return charCode >= 97 && charCode <= 122;
}
function isUpperCase(charCode: number): boolean {
    return charCode >= 65 && charCode <= 90;
}

function shiftCharCodeAlphabet(charCode: number, shift: number): number {
    let alphabetShift: number;
    if (isLowerCase(charCode)) alphabetShift = 97;
    else if (isUpperCase(charCode)) alphabetShift = 65;
    else return null;

    let newCharCode = (charCode - alphabetShift + shift);
    newCharCode = (newCharCode % 26);
    if (newCharCode < 0) newCharCode += 26;
    newCharCode += alphabetShift;
    return newCharCode;
}