/**
 * Armstrong Number Check Algorithm Implementation
 * This code demonstrates the algorithm that would be represented in Flowchart 2
 */

// Function to check if a number is an Armstrong number
function isArmstrongNumber(num) {
    // Convert number to string to easily access individual digits
    const numStr = num.toString();
    const digits = numStr.length;
    let sum = 0;
    let temp = num;

    console.log(`Checking if ${num} is an Armstrong number...`);
    console.log(`Total digits: ${digits}`);

    // Loop through each digit
    while (temp > 0) {
        const digit = temp % 10;  // Get the last digit
        console.log(`Digit: ${digit}, Power: ${digit}^${digits} = ${Math.pow(digit, digits)}`);
        
        sum += Math.pow(digit, digits);  // Add digit^digits to sum
        temp = Math.floor(temp / 10);    // Remove the last digit
        console.log(`Current sum: ${sum}, Remaining temp: ${temp}`);
    }

    const result = sum === num;
    console.log(`Sum of powered digits: ${sum}`);
    console.log(`Original number: ${num}`);
    console.log(`${num} is ${result ? '' : 'NOT '}an Armstrong number`);

    return result;
}

// Alternative implementation using string manipulation (more readable)
function isArmstrongNumberV2(num) {
    const numStr = num.toString();
    const digits = numStr.length;
    
    // Calculate sum of each digit raised to the power of total digits
    const sum = numStr
        .split('')
        .map(digit => Math.pow(parseInt(digit), digits))
        .reduce((acc, val) => acc + val, 0);

    return sum === num;
}

// Function to find all Armstrong numbers in a given range
function findArmstrongNumbers(start, end) {
    const armstrongNumbers = [];
    
    for (let i = start; i <= end; i++) {
        if (isArmstrongNumberV2(i)) {
            armstrongNumbers.push(i);
        }
    }
    
    return armstrongNumbers;
}

// Test the function with examples
console.log("=== ARMSTRONG NUMBER CHECK TESTS ===\n");

// Test known Armstrong numbers
console.log("Testing known Armstrong numbers:");
isArmstrongNumber(153);   // 1^3 + 5^3 + 3^3 = 1 + 125 + 27 = 153
console.log();

isArmstrongNumber(371);   // 3^3 + 7^3 + 1^3 = 27 + 343 + 1 = 371
console.log();

isArmstrongNumber(9474);  // 9^4 + 4^4 + 7^4 + 4^4 = 6561 + 256 + 2401 + 256 = 9474
console.log();

// Test a non-Armstrong number
console.log("Testing a non-Armstrong number:");
isArmstrongNumber(123);   // 1^3 + 2^3 + 3^3 = 1 + 8 + 27 = 36 ≠ 123
console.log();

// Find all 3-digit Armstrong numbers
console.log("=== ALL 3-DIGIT ARMSTRONG NUMBERS ===");
const threeDigitArmstrong = findArmstrongNumbers(100, 999);
console.log(`3-digit Armstrong numbers: [${threeDigitArmstrong.join(', ')}]`);
console.log();

// Find all 4-digit Armstrong numbers
console.log("=== ALL 4-DIGIT ARMSTRONG NUMBERS ===");
const fourDigitArmstrong = findArmstrongNumbers(1000, 9999);
console.log(`4-digit Armstrong numbers: [${fourDigitArmstrong.join(', ')}]`);
console.log();

// Demonstrate the algorithm step by step for number 153
console.log("=== STEP-BY-STEP ANALYSIS FOR 153 ===");
let n = 153;
let temp = n;
let sum = 0;
const digits = n.toString().length;

console.log(`Input number: ${n}`);
console.log(`Number of digits: ${digits}`);
console.log(`Initial: temp = ${temp}, sum = ${sum}\n`);

let step = 1;
while (temp > 0) {
    const digit = temp % 10;
    const powered = Math.pow(digit, digits);
    sum += powered;
    temp = Math.floor(temp / 10);
    
    console.log(`Step ${step}:`);
    console.log(`  Digit extracted: ${digit}`);
    console.log(`  ${digit}^${digits} = ${powered}`);
    console.log(`  Sum so far: ${sum}`);
    console.log(`  Remaining number: ${temp}`);
    console.log();
    step++;
}

console.log(`Final check: ${sum} === ${n} ? ${sum === n ? 'YES' : 'NO'}`);
console.log(`${n} is ${sum === n ? 'an Armstrong number' : 'NOT an Armstrong number'}!`);