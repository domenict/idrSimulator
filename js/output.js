let lastOutput = null;

function formatOutput(rawOutput) {
    const formattedOutput = structuredClone(rawOutput);
    lastOutput = formattedOutput;

    console.log(`SIMULATED OUTPUT: ${new Date()}`);
    console.log(formattedOutput);
}
