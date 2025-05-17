const { all, create } = require('mathjs');
   const math = create(all);

   // Custom operator for 'div'
   math.import({
     div: function (a, b) {
       return b !== 0 ? a / b : 0; // Avoid division by zero
     },
   });

   let str = 'not(2 == 0  and  6 == 0  and  2 == 0  and  5 == 0)';


   console.log('Normalized expression:', str);
   const result = math.evaluate(str);
   console.log('Result:', result); // Outputs: 1
   console.log('Boolean result:', !!result); // Outputs: true