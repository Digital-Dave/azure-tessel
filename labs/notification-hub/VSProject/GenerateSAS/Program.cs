﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Globalization;
using Microsoft.ServiceBus.Messaging;
using Microsoft.ServiceBus;

namespace GenerateSAS
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("What is your service bus namespace?");
            string sbNamespace = Console.ReadLine();
           

            Console.WriteLine("What is the path?");
            string sbPath = Console.ReadLine();

            Console.WriteLine("What existing shared access policy would you like to use to generate your SAS?");
            string sbPolicy = Console.ReadLine();

            Console.WriteLine("What is that policy's shared access key (primary or secondary)?");
            string sbKey = Console.ReadLine();

            Console.WriteLine("When should this expire (MM/DD/YY HH, GMT)? (press enter for 10/31/2020 12:00)");
            string sbExpiry = Console.ReadLine();
            if (sbExpiry.Length == 0) sbExpiry = "10/31/2020 12";

            // convert the string into a timespan... 
            DateTime tmpDT;
            DateTime.TryParseExact(sbExpiry, "MM/dd/YY HH", null, DateTimeStyles.None, out tmpDT);
            TimeSpan expiry = DateTime.UtcNow.Subtract(tmpDT);

            var serviceUri = ServiceBusEnvironment.CreateServiceUri("https", sbNamespace, sbPath).ToString().Trim('/');
            string generatedSaS = SharedAccessSignatureTokenProvider.GetSharedAccessSignature(sbPolicy, sbKey, serviceUri, expiry);

            Console.WriteLine("Your SAS is:\n{0}", generatedSaS);
            Console.WriteLine("Press any key to exit...");
            Console.ReadKey();
        }
    }
}




